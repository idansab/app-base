import React from "react";
import { Lightbulb } from "lucide-react";
import PendingCommunityList from "./PendingCommunityList";

export default function PendingTips({ onChanged }) {
  return (
    <PendingCommunityList
      entityName="Tip"
      icon={Lightbulb}
      emptyTitle="אין טיפים שממתינים לאישור"
      onChanged={onChanged}
    />
  );
}