import React from "react";
import { Radio } from "lucide-react";
import PendingCommunityList from "./PendingCommunityList";

export default function PendingReports({ onChanged }) {
  return (
    <PendingCommunityList
      entityName="FieldReport"
      icon={Radio}
      emptyTitle="אין דיווחים שממתינים לאישור"
      onChanged={onChanged}
    />
  );
}