import React from "react";
import ReportModal from "../components/report/ReportModal";

export default function ReportPage() {
  return (
    <ReportModal
      open={true}
      targetType="post"
      targetId={null}
      onClose={() => {}}
    />
  );
}
