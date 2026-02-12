exports.computeUserStatus = (u) => {
  const now = Date.now();

  if (u.deletedAt) return "deleted";

  if (u.suspendUntil) {
    const t = new Date(u.suspendUntil).getTime();
    if (!Number.isNaN(t) && t > now) return "suspended";
  }

  if (u.isActive === false) return "blocked";
  if (u.isEmailVerified === false) return "unverified";

  return "active";
};
