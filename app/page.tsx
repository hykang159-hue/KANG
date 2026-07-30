import type { Metadata } from "next";
import { TennisMonitor } from "./tennis/tennis-monitor";
import "./tennis/tennis.css";

export const metadata: Metadata = {
  title: "목동테니스장 예약 모니터링",
  description:
    "양천구시설관리공단 목동테니스장 예약 가능 현황을 월 달력으로 확인합니다.",
};

export default function Home() {
  return (
    <div className="tennis-page">
      <TennisMonitor />
    </div>
  );
}
