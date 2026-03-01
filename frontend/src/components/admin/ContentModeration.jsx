import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ContentModeration.css";
import {
  adminGetReports,
  adminHandleReport,
  adminGetReportDetail,
} from "../../api/adminReportApi";

const CATEGORY_LABEL_VI = {
  spam: "Spam / Quảng cáo",
  harassment: "Quấy rối / Lăng mạ",
  inappropriate: "Không phù hợp",
  false_info: "Thông tin sai lệch",
  other: "Khác",
};

const STATUS_LABEL_VI = {
  pending: "Chờ xử lý",
  reviewed: "Đã xử lý",
  dismissed: "Đã bỏ qua",
};

const fmtTime = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
};

const firstMedia = (post) =>
  Array.isArray(post?.mediaUrl) ? post.mediaUrl[0] : null;

const isVideo = (url) =>
  url?.endsWith(".mp4") || url?.includes("/video/") || url?.includes("video");

export default function ContentModeration() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState("");
  const [err, setErr] = useState("");

  // detail modal
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / limit)),
    [total],
  );

  const owner = (r) => r?.owner || r?.post?.userId || null;
  const reporter = (r) => r?.reporter || null;

  const getLatLng = (r) => {
    const lat = r?.post?.place?.location?.lat;
    const lng = r?.post?.place?.location?.lng;
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
    return null;
  };

  const goToMap = (r) => {
    const postId = r?.targetId || r?.post?._id;
    if (!postId) return;

    const p = getLatLng(r);
    const url = p
      ? `/map?focusLat=${p.lat}&focusLng=${p.lng}&openPosts=1&postId=${postId}`
      : `/map?openPosts=1&postId=${postId}`;

    navigate(url);
  };

  const load = async () => {
    try {
      setErr("");
      setLoading(true);

      const res = await adminGetReports({
        status,
        targetType: "post",
        category: category || undefined,
        q: q || undefined,
        page,
        limit,
      });

      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (e) {
      setErr(
        e?.response?.data?.message || e?.message || "Tải danh sách thất bại",
      );
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, page]);

  const openDetail = async (id) => {
    try {
      setOpen(true);
      setDetail(null);
      const res = await adminGetReportDetail(id);
      setDetail(res?.data || null);
    } catch (e) {
      alert(
        e?.response?.data?.message || e?.message || "Tải chi tiết thất bại",
      );
      setOpen(false);
      setDetail(null);
    }
  };

  const doHandle = async (reportId, payload, confirmText) => {
    const ok = window.confirm(confirmText || "Bạn chắc chắn chứ?");
    if (!ok) return;

    try {
      setActingId(reportId);
      await adminHandleReport(reportId, payload);
      await load();
      setOpen(false);
      setDetail(null);
    } catch (e) {
      alert(e?.response?.data?.message || e?.message || "Thao tác thất bại");
    } finally {
      setActingId("");
    }
  };

  return (
    <div className="cm-wrap">
      {/* Header + filters */}
      <div className="cm-topbar">
        <div className="cm-title">Kiểm duyệt nội dung</div>

        <div className="cm-filters">
          <select
            className="cm-select"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            aria-label="Trạng thái"
          >
            <option value="pending">Chờ xử lý</option>
            <option value="reviewed">Đã xử lý</option>
            <option value="dismissed">Đã bỏ qua</option>
          </select>

          <select
            className="cm-select"
            value={category}
            onChange={(e) => {
              setPage(1);
              setCategory(e.target.value);
            }}
            aria-label="Danh mục"
          >
            <option value="">Tất cả</option>
            <option value="spam">Spam</option>
            <option value="harassment">Quấy rối</option>
            <option value="inappropriate">Không phù hợp</option>
            <option value="false_info">Sai lệch</option>
            <option value="other">Khác</option>
          </select>
        </div>

        <div className="cm-searchRow">
          <input
            className="cm-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm lý do / mô tả..."
          />

          <button
            className="cm-btn cm-btnGhost"
            onClick={() => {
              setPage(1);
              load();
            }}
            disabled={loading}
          >
            {loading ? "Đang tải..." : "Làm mới"}
          </button>
        </div>

        <div className="cm-sub">
          <span>
            Tổng: <b>{total}</b>
          </span>
          <span>
            Trang <b>{page}</b>/<b>{totalPages}</b>
          </span>
        </div>

        {err && <div className="cm-error">{err}</div>}
      </div>

      {/* List cards */}
      <div className="cm-list">
        {loading && (
          <>
            <div className="cm-skeleton" />
            <div className="cm-skeleton" />
            <div className="cm-skeleton" />
          </>
        )}

        {!loading && items.length === 0 && (
          <div className="cm-empty">Chưa có nội dung bị báo cáo</div>
        )}

        {!loading &&
          items.map((r) => {
            const u = owner(r);
            const rep = reporter(r);
            const post = r.post;
            const thumb = firstMedia(post);

            return (
              <div className="cm-card" key={r._id}>
                {/* ✅ Spam ngang hàng với Chi tiết */}
                <div className="cm-cardTop">
                  <div className="cm-cardTopLeft">
                    <div className={`cm-pill cm-pill-${r.category || "other"}`}>
                      {CATEGORY_LABEL_VI[r.category] || "Khác"}
                    </div>

                    <button
                      className="cm-miniBtn cm-miniBtnPrimary"
                      onClick={() => openDetail(r._id)}
                    >
                      Chi tiết
                    </button>

                    {getLatLng(r) && (
                      <button
                        className="cm-miniBtn cm-miniBtnInfo"
                        onClick={() => goToMap(r)}
                        title="Mở bản đồ"
                      >
                        Bản đồ
                      </button>
                    )}
                  </div>

                  <div className={`cm-status cm-status-${r.status}`}>
                    {STATUS_LABEL_VI[r.status] || r.status}
                  </div>
                </div>

                <div className="cm-main">
                  <div className="cm-thumb">
                    {thumb ? (
                      isVideo(thumb) ? (
                        <div className="cm-thumbVideo">VIDEO</div>
                      ) : (
                        <img src={thumb} alt="" />
                      )
                    ) : (
                      <div className="cm-thumbEmpty">NO MEDIA</div>
                    )}
                  </div>

                  <div className="cm-info">
                    <div className="cm-line">
                      <span className="cm-key">Chủ bài:</span>
                      <span className="cm-val">
                        {u?.fullname || u?.username || "Unknown"}
                      </span>
                    </div>

                    <div className="cm-line">
                      <span className="cm-key">Người report:</span>
                      <span className="cm-val">
                        {rep?.fullname || rep?.username || "Unknown"}
                      </span>
                    </div>

                    <div className="cm-line">
                      <span className="cm-key">Thời gian:</span>
                      <span className="cm-val">{fmtTime(r.createdAt)}</span>
                    </div>

                    <div className="cm-previewText">
                      {post?.content || "(Không có nội dung)"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Pagination (mobile) */}
      <div className="cm-pagination">
        <button
          className="cm-btn cm-btnGhost"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1 || loading}
        >
          Trước
        </button>
        <button
          className="cm-btn cm-btnGhost"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages || loading}
        >
          Sau
        </button>
      </div>

      {/* Detail modal: bottom sheet */}
      {open && (
        <div className="cm-modalBackdrop" onClick={() => setOpen(false)}>
          <div className="cm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modalHeader">
              <div className="cm-modalTitle">Chi tiết báo cáo</div>
              <button className="cm-x" onClick={() => setOpen(false)}>
                ✕
              </button>
            </div>

            {!detail && <div className="cm-modalLoading">Đang tải...</div>}

            {detail && (
              <>
                <div className="cm-postBox">
                  <div className="cm-postMedia">
                    {firstMedia(detail.post) ? (
                      isVideo(firstMedia(detail.post)) ? (
                        <video
                          src={firstMedia(detail.post)}
                          controls
                          className="cm-video"
                        />
                      ) : (
                        <img src={firstMedia(detail.post)} alt="" />
                      )
                    ) : (
                      <div className="cm-thumbEmpty">NO MEDIA</div>
                    )}
                  </div>

                  <div className="cm-postText">
                    {detail.post?.content || "(Không có nội dung)"}
                  </div>

                  <div className="cm-postMeta">
                    Trạng thái bài: <b>{detail.post?.status || "unknown"}</b> •
                    ReportCount: <b>{detail.post?.reportCount ?? 0}</b>
                  </div>

                  <div className="cm-loc">
                    <div className="cm-locTitle">Vị trí</div>
                    <div className="cm-locRow">
                      <span className="cm-locName">
                        {detail.post?.place?.name || "Không có địa điểm"}
                      </span>
                    </div>

                    {getLatLng(detail) ? (
                      <div className="cm-locRow cm-mono">
                        {getLatLng(detail).lat}, {getLatLng(detail).lng}
                      </div>
                    ) : (
                      <div className="cm-locRow cm-subtle">Không có tọa độ</div>
                    )}
                  </div>
                </div>

                <div className="cm-section">
                  <div className="cm-sectionTitle">Thông tin report</div>

                  <div className="cm-kv">
                    <span className="k">Danh mục</span>
                    <span className="v">
                      {CATEGORY_LABEL_VI[detail.category] || "Khác"}
                    </span>
                  </div>

                  <div className="cm-kv">
                    <span className="k">Trạng thái</span>
                    <span className="v">{STATUS_LABEL_VI[detail.status]}</span>
                  </div>

                  <div className="cm-kv">
                    <span className="k">Tạo lúc</span>
                    <span className="v">{fmtTime(detail.createdAt)}</span>
                  </div>

                  <div className="cm-kv">
                    <span className="k">Người report</span>
                    <span className="v">
                      {reporter(detail)?.fullname ||
                        reporter(detail)?.username ||
                        "Unknown"}
                    </span>
                  </div>

                  <div className="cm-kv">
                    <span className="k">Chủ bài</span>
                    <span className="v">
                      {owner(detail)?.fullname ||
                        owner(detail)?.username ||
                        "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="cm-section">
                  <div className="cm-sectionTitle">Lý do</div>
                  <div className="cm-text">{detail.reason}</div>
                </div>

                <div className="cm-section">
                  <div className="cm-sectionTitle">Mô tả chi tiết</div>
                  <div className="cm-text">{detail.description || "-"}</div>
                </div>

                <div className="cm-modalActions">
                  {getLatLng(detail) && (
                    <button
                      className="cm-btn cm-btnInfo"
                      onClick={() => goToMap(detail)}
                      disabled={actingId === detail._id}
                    >
                      Mở bản đồ
                    </button>
                  )}

                  <button
                    className="cm-btn cm-btnWarn"
                    onClick={() =>
                      doHandle(
                        detail._id,
                        { status: "dismissed", actionTaken: "none" },
                        "Bỏ qua report này?",
                      )
                    }
                    disabled={actingId === detail._id}
                  >
                    Bỏ qua
                  </button>

                  <button
                    className="cm-btn cm-btnPrimary"
                    onClick={() =>
                      doHandle(
                        detail._id,
                        { status: "reviewed", actionTaken: "post_hidden" },
                        "Ẩn bài đăng này?",
                      )
                    }
                    disabled={actingId === detail._id}
                  >
                    Ẩn bài
                  </button>

                  <button
                    className="cm-btn cm-btnDanger"
                    onClick={() =>
                      doHandle(
                        detail._id,
                        { status: "reviewed", actionTaken: "post_deleted" },
                        "Xóa bài đăng này? (không thể hoàn tác)",
                      )
                    }
                    disabled={actingId === detail._id}
                  >
                    Xóa bài
                  </button>

                  <button
                    className="cm-btn cm-btnDangerOutline"
                    onClick={() =>
                      doHandle(
                        detail._id,
                        { status: "reviewed", actionTaken: "user_banned" },
                        "Chặn chủ bài viết?",
                      )
                    }
                    disabled={actingId === detail._id}
                  >
                    Chặn người dùng
                  </button>
                </div>

                {actingId === detail._id && (
                  <div className="cm-acting">Đang xử lý...</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
