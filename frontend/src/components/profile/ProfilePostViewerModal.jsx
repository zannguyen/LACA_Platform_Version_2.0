import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getPostDetail } from "../../api/postApi";
import "./ProfilePostViewerModal.css";

const isVideoUrl = (url = "") => {
  const u = String(url).toLowerCase();
  return (
    u.endsWith(".mp4") ||
    u.endsWith(".webm") ||
    u.endsWith(".mov") ||
    u.includes("/video/upload/") ||
    u.includes("video")
  );
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN");
};

const normalizePostDetail = (res) => {
  // getPostDetail() trả object: { success, data }
  if (res && typeof res === "object" && "success" in res) {
    if (res.success === false) throw new Error(res.message || "Load post failed");
    return res.data;
  }
  return res;
};

/**
 * IG-style post viewer: mở từ grid (profile) và lướt xuống xem các bài khác.
 */
export default function ProfilePostViewerModal({
  open,
  posts,
  startIndex = 0,
  onClose,
  reactionStates,
  onToggleLike,
  isOwnerProfile = true,
  onDeletePost,
}) {
  const [details, setDetails] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [sheetPostId, setSheetPostId] = useState(null);
  const [sheetStep, setSheetStep] = useState("menu"); // 'menu' | 'confirm'
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState("");
  const listRef = useRef(null);
  const itemRefs = useRef([]);

  const ids = useMemo(
    () =>
      (Array.isArray(posts) ? posts : [])
        .map((p) => String(p?._id || p?.id || ""))
        .filter(Boolean),
    [posts],
  );

  // lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // fetch details lazily (cache)
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const fetchMissing = async () => {
      const missing = ids.filter((id) => !details[id] && !loadingIds[id]);
      if (missing.length === 0) return;

      // mark loading
      setLoadingIds((prev) => {
        const next = { ...prev };
        missing.forEach((id) => {
          next[id] = true;
        });
        return next;
      });

      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await getPostDetail(id);
            const post = normalizePostDetail(res);
            if (cancelled) return;
            setDetails((prev) => ({ ...prev, [id]: post }));
          } catch (e) {
            if (cancelled) return;
            setDetails((prev) => ({ ...prev, [id]: { _id: id, __error: true } }));
          } finally {
            if (cancelled) return;
            setLoadingIds((prev) => ({ ...prev, [id]: false }));
          }
        }),
      );
    };

    fetchMissing();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ids.join("|")]);

  // scroll to selected item on open
  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, Math.min(startIndex, ids.length - 1));
    const raf = requestAnimationFrame(() => {
      itemRefs.current[idx]?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [open, startIndex, ids.length]);

  // close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset action sheet when modal closes
  useEffect(() => {
    if (open) return;
    setSheetPostId(null);
    setSheetStep("menu");
    setSheetBusy(false);
    setSheetError("");
  }, [open]);

  const openSheet = (postId) => {
    setSheetError("");
    setSheetBusy(false);
    setSheetStep("menu");
    setSheetPostId(String(postId));
  };

  const closeSheet = () => {
    if (sheetBusy) return;
    setSheetPostId(null);
    setSheetStep("menu");
    setSheetError("");
  };

  const confirmDelete = async () => {
    if (!sheetPostId || typeof onDeletePost !== "function") return;
    setSheetBusy(true);
    setSheetError("");
    try {
      const res = await onDeletePost(sheetPostId);
      if (res?.success === false)
        throw new Error(res?.message || "Xóa bài đăng thất bại");

      // nếu xóa hết bài -> đóng viewer
      const remaining = ids.filter((x) => x !== sheetPostId);
      closeSheet();
      if (remaining.length === 0) onClose?.();
    } catch (e) {
      setSheetError(e?.message || "Xóa bài đăng thất bại");
    } finally {
      setSheetBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="pv-overlay" role="dialog" aria-modal="true">
      <div className="pv-shell">
        <header className="pv-header">
          <button className="pv-close" onClick={onClose} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
          <div className="pv-title">Bài viết</div>
          <div className="pv-spacer" />
        </header>

        <div className="pv-body" ref={listRef}>
          {posts.map((raw, idx) => {
          const id = String(raw?._id || raw?.id);
          const post = details[id] && !details[id]?.__error ? details[id] : raw;
          const author = post?.userId || post?.user || {};

          const mediaUrls = Array.isArray(post?.mediaUrl)
            ? post.mediaUrl
            : post?.mediaUrl
              ? [post.mediaUrl]
              : post?.image
                ? [post.image]
                : [];

          const reacted = reactionStates?.[id]?.reacted;
          const likeCount =
            reactionStates?.[id]?.count ??
            post?.likeCount ??
            post?.reactionCount ??
            post?.likes ??
            0;

          const locationName =
            post?.placeId?.name || post?.placeId?.title || post?.placeName || "";

          const caption = post?.content || post?.caption || "";

          return (
            <article
              key={id}
              className="pv-post"
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
            >
              <div className="pv-post-header">
                <Link
                  to={
                    isOwnerProfile
                      ? "/profile"
                      : `/profile/${author?._id || author?.id}`
                  }
                  className="pv-author"
                >
                  <div className="pv-avatar">
                    {author?.avatar ? (
                      <img src={author.avatar} alt="avatar" />
                    ) : (
                      <div className="pv-avatar-fallback">
                        <i className="fa-solid fa-user" />
                      </div>
                    )}
                  </div>
                  <div className="pv-author-meta">
                    <div className="pv-author-name">
                      {author?.fullname || author?.username || "User"}
                    </div>
                    {locationName ? (
                      <div className="pv-location">
                        <i className="fa-solid fa-location-dot" />
                        <span>{locationName}</span>
                      </div>
                    ) : null}
                  </div>
                </Link>

                <div className="pv-actions">
                  <button
                    className={`pv-like ${reacted ? "liked" : ""}`}
                    onClick={() => onToggleLike?.(id)}
                    disabled={reactionStates?.[id]?.loading}
                    aria-label="Like"
                  >
                    <i className="fa-solid fa-heart" />
                    <span>{likeCount}</span>
                  </button>

                  {isOwnerProfile ? (
                    <button
                      className="pv-more"
                      onClick={() => openSheet(id)}
                      aria-label="More"
                      title="Tùy chọn"
                    >
                      <i className="fa-solid fa-ellipsis" />
                    </button>
                  ) : null}
                </div>
              </div>

              {mediaUrls.length > 0 ? (
                <div className="pv-media" aria-label="media">
                  <div className="pv-media-track">
                    {mediaUrls.map((url, mIdx) => (
                      <div className="pv-media-item" key={`${id}_${mIdx}`}> 
                        {isVideoUrl(url) || post?.type === "video" ? (
                          <video
                            src={url}
                            className="pv-media-el"
                            controls
                            playsInline
                          />
                        ) : (
                          <img src={url} alt="post" className="pv-media-el" />
                        )}
                      </div>
                    ))}
                  </div>
                  {mediaUrls.length > 1 ? (
                    <div className="pv-media-hint">Kéo ngang để xem thêm</div>
                  ) : null}
                </div>
              ) : (
                <div className="pv-no-media">No media</div>
              )}

              {(caption || (post?.tags && post.tags.length > 0)) && (
                <div className="pv-content">
                  {caption ? <div className="pv-caption">{caption}</div> : null}
                  {Array.isArray(post?.tags) && post.tags.length > 0 ? (
                    <div className="pv-tags">
                      {post.tags.map((t) => (
                        <span
                          key={t?._id || t?.id || t?.name}
                          className="pv-tag"
                          style={t?.color ? { borderColor: t.color } : undefined}
                        >
                          #{t?.name || t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="pv-date">{formatDate(post?.createdAt)}</div>
                </div>
              )}

              {details[id]?.__error ? (
                <div className="pv-error">Không tải được chi tiết bài viết.</div>
              ) : null}
            </article>
          );
          })}
        </div>

        {/* Action sheet (Instagram style) */}
        {sheetPostId ? (
          <div className="pv-sheet-overlay" onClick={closeSheet}>
            <div className="pv-sheet" onClick={(e) => e.stopPropagation()}>
              {sheetStep === "menu" ? (
                <>
                  <button
                    className="pv-sheet-btn danger"
                    onClick={() => setSheetStep("confirm")}
                  >
                    Xóa bài đăng
                  </button>
                  <button className="pv-sheet-btn" onClick={closeSheet}>
                    Hủy
                  </button>
                </>
              ) : (
                <>
                  <div className="pv-sheet-title">Xóa bài đăng?</div>
                  <div className="pv-sheet-sub">
                    Thao tác này không thể hoàn tác.
                  </div>
                  {sheetError ? (
                    <div className="pv-sheet-error">{sheetError}</div>
                  ) : null}
                  <button
                    className="pv-sheet-btn danger"
                    onClick={confirmDelete}
                    disabled={sheetBusy}
                  >
                    {sheetBusy ? "Đang xóa..." : "Xóa"}
                  </button>
                  <button
                    className="pv-sheet-btn"
                    onClick={closeSheet}
                    disabled={sheetBusy}
                  >
                    Hủy
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
