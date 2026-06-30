import RoomClientContent from "./RoomClient";

export function generateStaticParams() {
  return [{ id: "temp" }];
}

export default function RoomPage() {
  return <RoomClientContent />;
}
