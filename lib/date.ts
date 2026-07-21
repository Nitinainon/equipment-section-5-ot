const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function formatDateThaiLong(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return `${day} ${thaiMonths[month - 1]} ${year}`;
}

export function formatDateDDMMYYYY(dateIso: string) {
  const [year, month, day] = dateIso.split("-");
  return `${day}/${month}/${year}`;
}

export function getMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("รูปแบบเดือนและปีไม่ถูกต้อง");
  }

  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();

  return {
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
    label: `${thaiMonths[monthIndex - 1]} ${year}`,
  };
}

const otCountStartMinutes = 18 * 60;
const holidayDayStartMinutes = 8 * 60;
const holidayLunchStartMinutes = 12 * 60;
const holidayLunchEndMinutes = 13 * 60;
const holidayDayEndMinutes = 17 * 60;

export function minutesBetween(startTime: string, endTime: string) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  return Math.max(0, end - Math.max(start, otCountStartMinutes));
}

export type OtBreakdown = {
  dayType: "regular" | "holiday";
  totalMinutes: number;
  ot1xMinutes: number;
  ot15xMinutes: number;
  ot3xMinutes: number;
  weightedMinutes: number;
};

export function calculateOtBreakdown(
  startTime: string,
  endTime: string,
  isHoliday: boolean,
): OtBreakdown {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (!isHoliday) {
    const ot15xMinutes = Math.max(0, end - Math.max(start, otCountStartMinutes));
    return {
      dayType: "regular",
      totalMinutes: ot15xMinutes,
      ot1xMinutes: 0,
      ot15xMinutes,
      ot3xMinutes: 0,
      weightedMinutes: ot15xMinutes * 1.5,
    };
  }

  const beforeLunchMinutes = overlapMinutes(
    start,
    end,
    holidayDayStartMinutes,
    holidayLunchStartMinutes,
  );
  const afterLunchMinutes = overlapMinutes(
    start,
    end,
    holidayLunchEndMinutes,
    holidayDayEndMinutes,
  );
  const ot1xMinutes = beforeLunchMinutes + afterLunchMinutes;
  const ot3xMinutes = Math.max(0, end - Math.max(start, otCountStartMinutes));

  return {
    dayType: "holiday",
    totalMinutes: ot1xMinutes + ot3xMinutes,
    ot1xMinutes,
    ot15xMinutes: 0,
    ot3xMinutes,
    weightedMinutes: ot1xMinutes + ot3xMinutes * 3,
  };
}

function overlapMinutes(start: number, end: number, windowStart: number, windowEnd: number) {
  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart));
}

export function elapsedMinutesBetween(startTime: string, endTime: string) {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatHours(totalMinutes: number) {
  const hours = totalMinutes / 60;
  return Number.isInteger(hours)
    ? `${hours} ชั่วโมง`
    : `${hours.toFixed(2).replace(/\.?0+$/, "")} ชั่วโมง`;
}

export function normalizeTime(value: string) {
  return value.slice(0, 5);
}
