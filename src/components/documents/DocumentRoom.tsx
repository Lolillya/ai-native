"use client";

import { ReactNode } from "react";
import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";

interface DocumentRoomProps {
  documentId: string;
  children: ReactNode;
}

export default function DocumentRoom({
  documentId,
  children,
}: DocumentRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={`docflow-${documentId}`}>{children}</RoomProvider>
    </LiveblocksProvider>
  );
}
