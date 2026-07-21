import type { Metadata } from "next";
import { OtCalendarApp } from "./components/OtCalendarApp";

export const metadata: Metadata = {
  title: "Equipment Section 5 - OT",
  description:
    "ระบบวางแผนและลงทะเบียนการทำงานล่วงเวลาของสมาชิก Equipment Section 5",
};

export default function Home() {
  return <OtCalendarApp />;
}
