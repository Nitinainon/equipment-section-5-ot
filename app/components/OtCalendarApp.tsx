"use client";

import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  Filter,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Member,
  DisplaySettings,
  MemberHours,
  MemberPayload,
  MonthSummary,
  OvertimeAbsenceType,
  OvertimeDayType,
  OvertimeEntry,
  OvertimePayload,
  WeeklyHoliday,
} from "@/lib/types";

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

const thaiShortMonths = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const weekdayLabels = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const weekdayFullLabels = [
  "วันอาทิตย์",
  "วันจันทร์",
  "วันอังคาร",
  "วันพุธ",
  "วันพฤหัสบดี",
  "วันศุกร์",
  "วันเสาร์",
];

type FormState = {
  memberId: string;
  otDate: string;
  entryType: "ot" | "absent";
  absenceType: OvertimeAbsenceType;
  dayType: OvertimeDayType;
  startTime: string;
  endTime: string;
};

type FormMode = {
  type: "create" | "edit";
  entry?: OvertimeEntry;
};

type PendingSave = {
  mode: FormMode;
  payload: OvertimePayload;
};

type PendingDelete = {
  entry: OvertimeEntry;
};

type MembersResponse = {
  members?: Member[];
  message?: string;
};

type OvertimeResponse = {
  entries?: OvertimeEntry[];
  summary?: MonthSummary;
  message?: string;
};

type WeeklyHolidayResponse = {
  holidays?: WeeklyHoliday[];
  message?: string;
};

type SettingsResponse = {
  settings?: DisplaySettings;
  message?: string;
};

type MutationResponse = {
  message?: string;
};

type LeaveInfoRow = {
  member: Member;
  holidayOtMinutes: number;
  addedHolidayDays: number;
  sixthDayOffUsed: number;
  compensatoryLeaveUsed: number;
  sickLeaveUsed: number;
  personalLeaveUsed: number;
  vacationLeaveUsed: number;
  sickLeaveRemaining: number;
  personalLeaveRemaining: number;
  vacationLeaveRemaining: number;
};

type ActiveTab = "calendar" | "register" | "report" | "leave" | "members" | "settings";
type CalendarView = "month" | "week";

const emptyForm: FormState = {
  memberId: "",
  otDate: "",
  entryType: "ot",
  absenceType: "sixth_day_off",
  dayType: "regular",
  startTime: "17:00",
  endTime: "20:00",
};

const quickOtOptions = [
  { label: "1. OT 20:00", startTime: "17:00", endTime: "20:00", dayType: "regular" as const },
  { label: "2. OT 20:30", startTime: "17:00", endTime: "20:30", dayType: "regular" as const },
  { label: "3. OT 21:00", startTime: "17:00", endTime: "21:00", dayType: "regular" as const },
  { label: "4. OT 8:00-20:00", startTime: "08:00", endTime: "20:00", dayType: "holiday" as const },
  { label: "5. OT 8:00-17:00", startTime: "08:00", endTime: "17:00", dayType: "holiday" as const },
];

const absenceOptions: Array<{ type: OvertimeAbsenceType; label: string }> = [
  { type: "sixth_day_off", label: "ไม่มาทำงาน" },
  { type: "personal_leave", label: "ลากิจ" },
  { type: "sick_leave", label: "ลาป่วย" },
  { type: "vacation_leave", label: "ลาพักร้อน" },
  { type: "compensatory_leave", label: "ลางานใช้วันหยุดชดเชย" },
];

const emptyMemberForm: MemberPayload = {
  employeeNo: 8,
  employeeCode: "",
  name: "",
  nickname: "",
  chineseName: "",
  sickLeaveRemaining: 30,
  personalLeaveRemaining: 3,
  vacationLeaveRemaining: 0,
  color: "#2563eb",
  isActive: true,
};

const defaultDisplaySettings: DisplaySettings = {
  showEmployeeCode: true,
};

export function OtCalendarApp() {
  const todayIso = useMemo(() => getBangkokTodayIso(), []);
  const calendarExportRef = useRef<HTMLElement>(null);
  const dayExportRef = useRef<HTMLElement>(null);
  const registerSectionRef = useRef<HTMLElement>(null);
  const [selectedMonth, setSelectedMonth] = useState(todayIso.slice(0, 7));
  const [members, setMembers] = useState<Member[]>([]);
  const [adminMembers, setAdminMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [weeklyHolidays, setWeeklyHolidays] = useState<WeeklyHoliday[]>([]);
  const [adminWeeklyHolidays, setAdminWeeklyHolidays] = useState<WeeklyHoliday[]>([]);
  const [serverSummary, setServerSummary] = useState<MonthSummary | null>(null);
  const [memberFilter, setMemberFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(todayIso);
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pendingSave, setPendingSave] = useState<PendingSave | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("calendar");
  const [adminCode, setAdminCode] = useState("");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberPayload>>({});
  const [newMember, setNewMember] = useState<MemberPayload>(emptyMemberForm);
  const [displaySettings, setDisplaySettings] =
    useState<DisplaySettings>(defaultDisplaySettings);
  const [displaySettingsDraft, setDisplaySettingsDraft] =
    useState<DisplaySettings>(defaultDisplaySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<"calendar" | "day" | null>(null);
  const [error, setError] = useState("");
  const [adminError, setAdminError] = useState("");
  const [toast, setToast] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ month: selectedMonth });
      if (memberFilter) params.set("memberId", memberFilter);

      const [membersResponse, overtimeResponse, holidaysResponse, settingsResponse] = await Promise.all([
        fetch("/api/members"),
        fetch(`/api/overtime?${params.toString()}`),
        fetch("/api/weekly-holidays"),
        fetch("/api/settings"),
      ]);

      const membersData = (await membersResponse.json()) as MembersResponse;
      const overtimeData = (await overtimeResponse.json()) as OvertimeResponse;
      const holidaysData = (await holidaysResponse.json()) as WeeklyHolidayResponse;
      const settingsData = (await settingsResponse.json()) as SettingsResponse;

      if (!membersResponse.ok) throw new Error(membersData.message);
      if (!overtimeResponse.ok) throw new Error(overtimeData.message);
      if (!holidaysResponse.ok) throw new Error(holidaysData.message);
      if (!settingsResponse.ok) throw new Error(settingsData.message);

      setMembers(membersData.members ?? []);
      setEntries(overtimeData.entries ?? []);
      setWeeklyHolidays(holidaysData.holidays ?? []);
      setServerSummary(overtimeData.summary ?? null);
      setDisplaySettings(settingsData.settings ?? defaultDisplaySettings);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "ไม่สามารถโหลดข้อมูลได้",
      );
      setEntries([]);
      setWeeklyHolidays([]);
      setServerSummary(null);
    } finally {
      setLoading(false);
    }
  }, [memberFilter, selectedMonth]);

  const loadAdminData = useCallback(
    async (code = adminCode) => {
      setAdminError("");
      const headers = { "x-admin-code": code };
      const [membersResponse, holidaysResponse, settingsResponse] = await Promise.all([
        fetch("/api/admin/members", { headers }),
        fetch("/api/admin/weekly-holidays", { headers }),
        fetch("/api/admin/settings", { headers }),
      ]);
      const membersData = (await membersResponse.json()) as MembersResponse;
      const holidaysData = (await holidaysResponse.json()) as WeeklyHolidayResponse;
      const settingsData = (await settingsResponse.json()) as SettingsResponse;

      if (!membersResponse.ok) throw new Error(membersData.message);
      if (!holidaysResponse.ok) throw new Error(holidaysData.message);
      if (!settingsResponse.ok) throw new Error(settingsData.message);

      const nextMembers = membersData.members ?? [];
      setAdminMembers(nextMembers);
      setAdminWeeklyHolidays(holidaysData.holidays ?? []);
      setDisplaySettingsDraft(settingsData.settings ?? defaultDisplaySettings);
      setMemberDrafts(
        Object.fromEntries(
          nextMembers.map((member) => [
            member.id,
            {
              employeeNo: member.employee_no,
              employeeCode: member.employee_code ?? "",
              name: member.name,
              nickname: member.nickname ?? "",
              chineseName: member.chinese_name ?? "",
              sickLeaveRemaining: Number(member.sick_leave_remaining ?? 0),
              personalLeaveRemaining: Number(member.personal_leave_remaining ?? 0),
              vacationLeaveRemaining: Number(member.vacation_leave_remaining ?? 0),
              color: member.color,
              isActive: member.is_active,
            },
          ]),
        ),
      );
    },
    [adminCode],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!window.matchMedia("(max-width: 760px)").matches) return;

    const frame = window.requestAnimationFrame(() => {
      setCalendarView("week");
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const searchableMember = [
        entry.member.employee_code ?? "",
        entry.member.name,
        entry.member.nickname ?? "",
        entry.member.chinese_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const memberMatch = !normalizedSearch || searchableMember.includes(normalizedSearch);
      return memberMatch;
    });
  }, [entries, searchTerm]);

  const filteredHolidays = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return weeklyHolidays.filter((holiday) => {
      const matchesMember = !memberFilter || holiday.member_id === memberFilter;
      const searchableMember = [
        holiday.member.employee_code ?? "",
        holiday.member.name,
        holiday.member.nickname ?? "",
        holiday.member.chinese_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !normalizedSearch || searchableMember.includes(normalizedSearch);
      return matchesMember && matchesSearch;
    });
  }, [memberFilter, searchTerm, weeklyHolidays]);

  const visibleLeaveMembers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return members.filter((member) => {
      if (memberFilter && member.id !== memberFilter) return false;
      const searchableMember = [
        member.employee_code ?? "",
        member.name,
        member.nickname ?? "",
        member.chinese_name ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return !normalizedSearch || searchableMember.includes(normalizedSearch);
    });
  }, [memberFilter, members, searchTerm]);

  const visibleSummary = useMemo(() => {
    if (!searchTerm.trim() && serverSummary) return serverSummary;
    return buildClientSummary(filteredEntries, selectedMonth);
  }, [filteredEntries, searchTerm, selectedMonth, serverSummary]);

  const leaveInfoRows = useMemo(
    () => buildLeaveInfoRows(visibleLeaveMembers, filteredEntries),
    [filteredEntries, visibleLeaveMembers],
  );

  const entriesByDate = useMemo(() => {
    const grouped = new Map<string, OvertimeEntry[]>();
    for (const entry of filteredEntries) {
      const dateEntries = grouped.get(entry.ot_date) ?? [];
      dateEntries.push(entry);
      grouped.set(entry.ot_date, dateEntries);
    }
    for (const dateEntries of grouped.values()) {
      dateEntries.sort(compareOvertimeEntriesByMemberOrder);
    }
    return grouped;
  }, [filteredEntries]);

  const selectedDateEntries = selectedDate
    ? entriesByDate.get(selectedDate) ?? []
    : [];
  const selectedDateHolidays = selectedDate
    ? holidaysForDate(filteredHolidays, selectedDate)
    : [];
  const selectedOtEntries = selectedDateEntries.filter((entry) => entry.entry_type === "ot" && !isHolidayCreditEntry(entry));
  const selectedAbsentEntries = selectedDateEntries.filter((entry) => entry.entry_type === "absent");
  const selectedOtMemberCount = new Set(selectedOtEntries.map((entry) => entry.member_id)).size;
  const selectedBusyMemberIds = new Set([
    ...selectedDateEntries.map((entry) => entry.member_id),
    ...selectedDateHolidays.map((holiday) => holiday.member_id),
  ]);
  const selectedAvailableCount = Math.max(
    0,
    members.filter((member) => member.is_active).length - selectedBusyMemberIds.size,
  );
  const calendarDays = useMemo(
    () =>
      calendarView === "week"
        ? buildWeekDays(selectedDate ?? todayIso)
        : buildCalendarDays(selectedMonth),
    [calendarView, selectedDate, selectedMonth, todayIso],
  );
  const calendarTitle =
    calendarView === "week"
      ? formatWeekRangeShort(calendarDays[0].iso, calendarDays[6].iso)
      : monthLabel(selectedMonth);
  const exportCalendarTitle =
    calendarView === "week"
      ? `ปฏิทิน OT รายสัปดาห์ ${formatWeekRangeShort(calendarDays[0].iso, calendarDays[6].iso)}`
      : `ปฏิทิน OT ประจำเดือน${monthLabel(selectedMonth)}`;

  function goToPreviousMonth() {
    if (calendarView === "week") {
      const nextDate = shiftDate(selectedDate ?? todayIso, -7);
      setSelectedDate(nextDate);
      setSelectedMonth(nextDate.slice(0, 7));
      return;
    }
    setSelectedMonth(shiftMonth(selectedMonth, -1));
  }

  function goToNextMonth() {
    if (calendarView === "week") {
      const nextDate = shiftDate(selectedDate ?? todayIso, 7);
      setSelectedDate(nextDate);
      setSelectedMonth(nextDate.slice(0, 7));
      return;
    }
    setSelectedMonth(shiftMonth(selectedMonth, 1));
  }

  function goToToday() {
    setSelectedMonth(todayIso.slice(0, 7));
    setSelectedDate(todayIso);
    setActiveTab("calendar");
  }

  function goToHome() {
    setActiveTab("calendar");
    setFormMode(null);
    setPendingSave(null);
    setPendingDelete(null);
    setError("");
  }

  async function saveCalendarImage() {
    if (!calendarExportRef.current) return;
    setExporting("calendar");
    setError("");
    try {
      await downloadElementAsPng(
        calendarExportRef.current,
        `equipment-ot-calendar-${selectedMonth}.png`,
      );
      setToast("เซฟรูปปฏิทินเรียบร้อยแล้ว");
    } catch {
      setError("ไม่สามารถเซฟรูปปฏิทินได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setExporting(null);
    }
  }

  async function saveSelectedDayImage() {
    if (!dayExportRef.current) return;
    const dateIso = selectedDate ?? todayIso;
    setExporting("day");
    setError("");
    try {
      await waitForPaint();
      await downloadElementAsPng(
        dayExportRef.current,
        `equipment-ot-detail-${dateIso}.png`,
      );
      setToast("เซฟรายละเอียดวันนี้เรียบร้อยแล้ว");
    } catch {
      try {
        downloadElementAsHtml(dayExportRef.current, `equipment-ot-detail-${dateIso}.html`);
        setToast("เซฟรายละเอียดวันนี้เป็นไฟล์ HTML เรียบร้อยแล้ว");
      } catch {
        setError("ไม่สามารถเซฟรายละเอียดวันนี้ได้ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setExporting(null);
    }
  }

  async function copySelectedDayChatText() {
    const dateIso = selectedDate ?? todayIso;
    const chatText = buildChatExportText(dateIso, selectedDateEntries);
    setError("");

    try {
      await copyTextToClipboard(chatText);
      setToast("คัดลอกรายชื่อ OT สำหรับแชทเรียบร้อยแล้ว");
    } catch {
      setError("ไม่สามารถคัดลอกข้อความได้ กรุณาลองใหม่อีกครั้ง");
    }
  }

  function openCreateForm(dateIso = selectedDate ?? todayIso) {
    setError("");
    setActiveTab("register");
    setFormMode({ type: "create" });
    setForm({
      ...emptyForm,
      memberId: memberFilter,
      otDate: dateIso,
    });
  }

  function openEditForm(entry: OvertimeEntry) {
    setError("");
    setFormMode({ type: "edit", entry });
    setForm({
      memberId: entry.member_id,
      otDate: entry.ot_date,
      entryType: entry.entry_type,
      absenceType: entry.absence_type ?? "sixth_day_off",
      dayType: entry.day_type,
      startTime: entry.start_time ?? "",
      endTime: entry.end_time ?? "",
    });
  }

  function requestSave() {
    if (!formMode) return;

    try {
      const payload = validateClientForm(form);
      setError("");
      setPendingSave({ mode: formMode, payload });
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : "ข้อมูลไม่ถูกต้อง");
    }
  }

  async function confirmSave() {
    if (!pendingSave) return;
    setSaving(true);
    setError("");

    try {
      const endpoint =
        pendingSave.mode.type === "edit" && pendingSave.mode.entry
          ? `/api/overtime/${pendingSave.mode.entry.id}`
          : "/api/overtime";
      const response = await fetch(endpoint, {
        method: pendingSave.mode.type === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingSave.payload),
      });
      const data = (await response.json()) as MutationResponse;

      if (!response.ok) throw new Error(data.message);

      setToast(data.message ?? "บันทึกข้อมูล OT เรียบร้อยแล้ว");
      setPendingSave(null);
      setFormMode(null);
      setActiveTab("calendar");
      await loadData();
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "ไม่สามารถบันทึกข้อมูลได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/overtime/${pendingDelete.entry.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as MutationResponse;

      if (!response.ok) throw new Error(data.message);

      setToast(data.message ?? "ลบข้อมูล OT เรียบร้อยแล้ว");
      setPendingDelete(null);
      await loadData();
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "ไม่สามารถลบข้อมูลได้",
      );
      setPendingDelete(null);
    } finally {
      setSaving(false);
    }
  }

  async function unlockAdmin() {
    setSaving(true);
    setAdminError("");
    try {
      await loadAdminData(adminCode);
      setAdminUnlocked(true);
      setToast("ปลดล็อกหน้าจัดการเรียบร้อยแล้ว");
    } catch (currentError) {
      setAdminUnlocked(false);
      setAdminError(
        currentError instanceof Error ? currentError.message : "ไม่สามารถปลดล็อกได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveMember(memberId: string) {
    const draft = memberDrafts[memberId];
    if (!draft) return;
    setSaving(true);
    setAdminError("");
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": adminCode,
        },
        body: JSON.stringify(draft),
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok) throw new Error(data.message);
      setToast(data.message ?? "แก้ไขสมาชิกเรียบร้อยแล้ว");
      await Promise.all([loadAdminData(), loadData()]);
    } catch (currentError) {
      setAdminError(
        currentError instanceof Error ? currentError.message : "ไม่สามารถแก้ไขสมาชิกได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function addMember() {
    setSaving(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": adminCode,
        },
        body: JSON.stringify(newMember),
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok) throw new Error(data.message);
      setToast(data.message ?? "เพิ่มสมาชิกเรียบร้อยแล้ว");
      setNewMember({
        ...emptyMemberForm,
        employeeNo: Math.max(0, ...adminMembers.map((member) => member.employee_no)) + 1,
      });
      await Promise.all([loadAdminData(), loadData()]);
    } catch (currentError) {
      setAdminError(
        currentError instanceof Error ? currentError.message : "ไม่สามารถเพิ่มสมาชิกได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDisplaySettings() {
    setSaving(true);
    setAdminError("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": adminCode,
        },
        body: JSON.stringify(displaySettingsDraft),
      });
      const data = (await response.json()) as SettingsResponse & MutationResponse;
      if (!response.ok) throw new Error(data.message);

      const nextSettings = data.settings ?? displaySettingsDraft;
      setDisplaySettings(nextSettings);
      setDisplaySettingsDraft(nextSettings);
      setToast(data.message ?? "บันทึกการตั้งค่าเรียบร้อยแล้ว");
      await loadData();
    } catch (currentError) {
      setAdminError(
        currentError instanceof Error ? currentError.message : "ไม่สามารถบันทึกการตั้งค่าได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeWeeklyHoliday(id: string) {
    setSaving(true);
    setAdminError("");
    try {
      const response = await fetch(`/api/admin/weekly-holidays/${id}`, {
        method: "DELETE",
        headers: { "x-admin-code": adminCode },
      });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok) throw new Error(data.message);
      setToast(data.message ?? "ลบวันหยุดประจำสัปดาห์เรียบร้อยแล้ว");
      await Promise.all([loadAdminData(), loadData()]);
    } catch (currentError) {
      setAdminError(
        currentError instanceof Error ? currentError.message : "ไม่สามารถลบวันหยุดได้",
      );
    } finally {
      setSaving(false);
    }
  }

  async function setMemberWeeklyHoliday(
    memberId: string,
    weekday: number,
    checked: boolean,
  ) {
    const existing = adminWeeklyHolidays.find(
      (holiday) => holiday.member_id === memberId && holiday.weekday === weekday,
    );

    if (checked && existing) return;
    if (!checked && !existing) return;

    setSaving(true);
    setAdminError("");

    try {
      const response = checked
        ? await fetch("/api/admin/weekly-holidays", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-admin-code": adminCode,
            },
            body: JSON.stringify({ memberId, weekday }),
          })
        : await fetch(`/api/admin/weekly-holidays/${existing?.id}`, {
            method: "DELETE",
            headers: { "x-admin-code": adminCode },
          });
      const data = (await response.json()) as MutationResponse;
      if (!response.ok) throw new Error(data.message);
      setToast(
        data.message ??
          (checked
            ? "เพิ่มวันหยุดประจำสัปดาห์เรียบร้อยแล้ว"
            : "ลบวันหยุดประจำสัปดาห์เรียบร้อยแล้ว"),
      );
      await Promise.all([loadAdminData(), loadData()]);
    } catch (currentError) {
      setAdminError(
        currentError instanceof Error
          ? currentError.message
          : "ไม่สามารถแก้ไขวันหยุดได้",
      );
    } finally {
      setSaving(false);
    }
  }

  function goToRegisterTab() {
    const targetDate = selectedDate ?? todayIso;

    setFormMode(null);
    setForm((current) => ({
      ...current,
      otDate: targetDate,
    }));
    setActiveTab("register");

    window.requestAnimationFrame(() => {
      registerSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function handleTabChange(tab: ActiveTab) {
    if (tab === "register") {
      goToRegisterTab();
      return;
    }

    setActiveTab(tab);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="banner-home" type="button" onClick={goToHome} aria-label="กลับไปหน้าหลัก">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt=""
            aria-hidden="true"
            className="banner-art"
            src="/equipment-ot-banner.jpg"
          />
          <span className="sr-only">Equipment Section 5 - OT ระบบวางแผนและลงทะเบียน OT</span>
        </button>
        <button
          className="top-icon"
          type="button"
          aria-label="ตั้งค่า"
          onClick={() => setActiveTab("settings")}
        >
          <Settings size={21} />
        </button>
      </header>

      <section className="month-toolbar">
        <button className="square-action" type="button" onClick={goToPreviousMonth} aria-label="เดือนก่อนหน้า">
          <ChevronLeft size={22} />
        </button>
        <label className="month-picker">
          <span>{calendarTitle}</span>
          <input
            aria-label="เลือกเดือนและปี"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          />
        </label>
        <button className="square-action" type="button" onClick={goToNextMonth} aria-label="เดือนถัดไป">
          <ChevronRight size={22} />
        </button>
        <button className="today-action" type="button" onClick={goToToday}>
          วันนี้
        </button>
      </section>

      <section className="search-row">
        <label className="app-input search-input">
          <Search size={22} aria-hidden />
          <input
            aria-label="ค้นหาชื่อสมาชิก"
            placeholder="ค้นหาชื่อสมาชิก"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="app-input filter-input">
          <Filter size={20} aria-hidden />
          <select
            aria-label="ตัวกรองสมาชิก"
            value={memberFilter}
            onChange={(event) => setMemberFilter(event.target.value)}
          >
            <option value="">ทั้งหมด</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {memberFullLabel(member, displaySettings.showEmployeeCode)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="mobile-status-grid" aria-label="สรุปวันที่เลือก">
        <div className="status-card">
          <span className="status-icon">
            <Users size={19} aria-hidden />
          </span>
          <span>OT วันนี้</span>
          <strong>{selectedOtMemberCount} คน</strong>
        </div>
        <div className="status-card cyan">
          <span className="status-icon">
            <Users size={19} aria-hidden />
          </span>
          <span>ว่าง</span>
          <strong>{selectedAvailableCount} คน</strong>
        </div>
        <div className="status-card amber">
          <span className="status-icon">
            <CalendarCheck size={19} aria-hidden />
          </span>
          <span>วันหยุด</span>
          <strong>{selectedDateHolidays.length + selectedAbsentEntries.length} คน</strong>
        </div>
      </section>

      <section className="export-actions" aria-label="บันทึกรูปข้อมูล OT">
        <div className="view-toggle" aria-label="มุมมองปฏิทิน">
          <button
            className={calendarView === "month" ? "active" : ""}
            type="button"
            onClick={() => setCalendarView("month")}
          >
            เดือน
          </button>
          <button
            className={calendarView === "week" ? "active" : ""}
            type="button"
            onClick={() => setCalendarView("week")}
          >
            สัปดาห์
          </button>
        </div>
        <button
          className="btn-secondary"
          type="button"
          onClick={saveCalendarImage}
          disabled={Boolean(exporting) || loading}
        >
          <Download size={17} aria-hidden />
          {exporting === "calendar" ? "กำลังเซฟ..." : "เซฟรูปปฏิทิน"}
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={saveSelectedDayImage}
          disabled={Boolean(exporting) || loading}
        >
          <Download size={17} aria-hidden />
          {exporting === "day" ? "กำลังเซฟ..." : "เซฟรายละเอียดวันนี้"}
        </button>
      </section>

      {error ? (
        <div className="app-alert">
          <AlertCircle size={18} aria-hidden />
          {error}
        </div>
      ) : null}

      {activeTab === "calendar" || activeTab === "register" ? (
        <section
          className={`calendar-panel export-calendar-panel ${
            calendarView === "week" ? "week-calendar-panel" : ""
          }`}
          ref={calendarExportRef}
        >
          <div className="calendar-export-title">
            <span>Equipment Section 5 - OT</span>
            <strong>{exportCalendarTitle}</strong>
          </div>
          <div className="calendar-grid calendar-weekdays">
            {weekdayLabels.map((label, index) => (
              <div className={index === 0 || index === 6 ? "weekend-label" : ""} key={label}>
                {label}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {calendarDays.map((day) => {
              const dayEntries = entriesByDate.get(day.iso) ?? [];
              const countedEntries = dayEntries.filter((entry) => !isHolidayCreditEntry(entry));
              const dayHolidays = holidaysForDate(filteredHolidays, day.iso);
              const visibleEntries = dayEntries;
              const visibleHolidays = dayHolidays;

              return (
                <button
                  className={[
                    "day-cell",
                    day.inMonth ? "" : "day-muted",
                    day.isToday ? "day-today" : "",
                    day.isWeekend ? "day-weekend" : "",
                    selectedDate === day.iso ? "day-selected" : "",
                  ].join(" ")}
                  key={day.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(day.iso);
                    setActiveTab("calendar");
                  }}
                >
                  <span className="day-number">{day.day}</span>
                  <span className="day-counts">
                    {countedEntries.length > 0 ? (
                      <span>
                        <i /> {countedEntries.length} รายการ
                      </span>
                    ) : null}
                    {dayHolidays.length > 0 ? (
                      <span className="holiday-count">
                        <i /> หยุด {dayHolidays.length}
                      </span>
                    ) : null}
                  </span>
                  <span className="day-items">
                    {visibleEntries.map((entry) => {
                      const isAbsent = entry.entry_type === "absent";
                      const isHolidayCredit = isHolidayCreditEntry(entry);

                      return (
                        <span
                          className={isAbsent ? "absent-pill" : "ot-pill"}
                          key={entry.id}
                          style={
                            isAbsent
                              ? undefined
                              : {
                                  backgroundColor: addAlpha(entry.member.color, 0.26),
                                  color: "#ffffff",
                                }
                          }
                        >
                          {isAbsent
                            ? `${absenceTypeLabel(entry.absence_type)}: ${memberCalendarName(entry.member)}`
                            : isHolidayCredit
                              ? `เก็บ: ${memberCalendarName(entry.member)}`
                              : memberCalendarName(entry.member)}
                        </span>
                      );
                    })}
                    {visibleHolidays.map((holiday) => (
                      <span className="holiday-pill" key={holiday.id}>
                        หยุด: {memberCalendarName(holiday.member)}
                      </span>
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {activeTab === "register" ? (
        <section className="section-card inline-form-card" ref={registerSectionRef}>
          <SectionTitle icon={<Plus size={20} />} title="ลงทะเบียนข้อมูล" />
          <OtForm
            form={form}
            members={members}
            showEmployeeCode={displaySettings.showEmployeeCode}
            onChange={setForm}
            onCancel={() => setActiveTab("calendar")}
            onSave={() => {
              try {
                const payload = validateClientForm(form);
                setPendingSave({ mode: formMode ?? { type: "create" }, payload });
              } catch (currentError) {
                setError(
                  currentError instanceof Error
                    ? currentError.message
                    : "ข้อมูลไม่ถูกต้อง",
                );
              }
            }}
          />
        </section>
      ) : null}

      {activeTab === "report" ? (
        <SummaryPanel
          summary={visibleSummary}
          showEmployeeCode={displaySettings.showEmployeeCode}
        />
      ) : null}

      {activeTab === "leave" ? (
        <LeaveInfoPanel
          monthLabelText={monthLabel(selectedMonth)}
          rows={leaveInfoRows}
          showEmployeeCode={displaySettings.showEmployeeCode}
        />
      ) : null}

      {activeTab === "members" ? (
        <AdminPanel
          adminCode={adminCode}
          adminError={adminError}
          adminMembers={adminMembers}
          adminUnlocked={adminUnlocked}
          holidays={adminWeeklyHolidays}
          memberDrafts={memberDrafts}
          newMember={newMember}
          saving={saving}
          onAddMember={addMember}
          onAdminCodeChange={setAdminCode}
          onMemberDraftChange={(id, draft) =>
            setMemberDrafts((current) => ({ ...current, [id]: draft }))
          }
          onNewMemberChange={setNewMember}
          onRemoveHoliday={removeWeeklyHoliday}
          onSaveMember={saveMember}
          onSetMemberHoliday={setMemberWeeklyHoliday}
          onUnlock={unlockAdmin}
        />
      ) : null}

      {activeTab === "settings" ? (
        <DisplaySettingsPanel
          adminCode={adminCode}
          adminError={adminError}
          adminUnlocked={adminUnlocked}
          settings={displaySettingsDraft}
          saving={saving}
          onAdminCodeChange={setAdminCode}
          onChange={setDisplaySettingsDraft}
          onSave={saveDisplaySettings}
          onUnlock={unlockAdmin}
        />
      ) : null}

      {activeTab === "calendar" ? (
        <>
          <DayDetailCard
            dateIso={selectedDate ?? todayIso}
            entries={selectedDateEntries}
            holidays={selectedDateHolidays}
            showEmployeeCode={displaySettings.showEmployeeCode}
            onCopyChatText={copySelectedDayChatText}
            onCreate={() => openCreateForm(selectedDate ?? todayIso)}
            onDelete={(entry) => setPendingDelete({ entry })}
            onEdit={openEditForm}
          />
          <SummaryPanel
            summary={visibleSummary}
            compact
            showEmployeeCode={displaySettings.showEmployeeCode}
          />
        </>
      ) : null}

      {loading ? <p className="loading-text">กำลังโหลดข้อมูล...</p> : null}

      <div className="export-capture-zone" aria-hidden="true">
        <ExportDayDetailCard
          ref={dayExportRef}
          dateIso={selectedDate ?? todayIso}
          entries={selectedDateEntries}
          holidays={selectedDateHolidays}
        />
      </div>

      <BottomNav activeTab={activeTab} onChange={handleTabChange} />

      {formMode && activeTab !== "register" ? (
        <Modal onClose={() => setFormMode(null)}>
          <div className="modal-header">
            <div>
              <h2>{formMode.type === "edit" ? "แก้ไขข้อมูล" : "ลงทะเบียนข้อมูล"}</h2>
              <p>กรอกข้อมูลการทำงานล่วงเวลา</p>
            </div>
            <button className="icon-button" type="button" onClick={() => setFormMode(null)} aria-label="ปิด">
              <X size={18} />
            </button>
          </div>
          <OtForm
            form={form}
            members={members}
            showEmployeeCode={displaySettings.showEmployeeCode}
            onChange={setForm}
            onCancel={() => setFormMode(null)}
            onSave={requestSave}
          />
        </Modal>
      ) : null}

      {pendingSave ? (
        <ConfirmSaveModal
          error={error}
          member={members.find((member) => member.id === pendingSave.payload.memberId)}
          payload={pendingSave.payload}
          saving={saving}
          showEmployeeCode={displaySettings.showEmployeeCode}
          onBack={() => {
            setError("");
            setPendingSave(null);
          }}
          onConfirm={confirmSave}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDeleteModal
          entry={pendingDelete.entry}
          saving={saving}
          showEmployeeCode={displaySettings.showEmployeeCode}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Check size={18} aria-hidden />
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function DayDetailCard({
  dateIso,
  entries,
  holidays,
  showEmployeeCode,
  onCopyChatText,
  onCreate,
  onEdit,
  onDelete,
}: {
  dateIso: string;
  entries: OvertimeEntry[];
  holidays: WeeklyHoliday[];
  showEmployeeCode: boolean;
  onCopyChatText: () => void;
  onCreate: () => void;
  onEdit: (entry: OvertimeEntry) => void;
  onDelete: (entry: OvertimeEntry) => void;
}) {
  const otEntries = entries.filter((entry) => entry.entry_type === "ot" && !isHolidayCreditEntry(entry));
  const absentEntries = entries.filter((entry) => entry.entry_type === "absent");
  const memberCount = new Set(otEntries.map((entry) => entry.member_id)).size;

  return (
    <section className="day-sheet">
      <div className="sheet-handle" />
      <div className="sheet-title-row">
        <div>
          <h2>รายละเอียดวันที่ {formatDateThaiLong(dateIso)}</h2>
          <p>
            สมาชิกทำ OT {memberCount} คน
            {absentEntries.length ? ` · ไม่มาทำงาน ${absentEntries.length} คน` : ""}
          </p>
        </div>
        <div className="sheet-actions">
          <button className="sheet-add" type="button" onClick={onCopyChatText}>
            <Clipboard size={18} aria-hidden />
            ส่งออกแชท
          </button>
          <button className="sheet-add" type="button" onClick={onCreate}>
            <Plus size={18} aria-hidden />
            เพิ่ม
          </button>
        </div>
      </div>

      <div className="detail-list">
        {entries.length ? (
          entries.map((entry) => (
            <div className="detail-row" key={entry.id}>
              <span className="member-dot" style={{ backgroundColor: entry.member.color }} />
              <div className="detail-name">
                <strong>{entry.member.name}</strong>
                <span>
                  {memberSecondaryLabel(entry.member, showEmployeeCode)}
                  {memberSecondaryLabel(entry.member, showEmployeeCode) ? " - " : ""}
                  {entry.entry_type === "absent"
                    ? absenceTypeLabel(entry.absence_type)
                    : isHolidayCreditEntry(entry)
                      ? formatEntryRateBreakdown(entry)
                      : `${entry.start_time}-${entry.end_time} (${formatEntryRateBreakdown(entry)})`}
                </span>
              </div>
              <button className="row-icon edit" type="button" onClick={() => onEdit(entry)} aria-label="แก้ไข">
                <Pencil size={18} />
              </button>
              <button className="row-icon danger" type="button" onClick={() => onDelete(entry)} aria-label="ลบ">
                <Trash2 size={18} />
              </button>
            </div>
          ))
        ) : (
          <p className="empty-state">ยังไม่มีสมาชิกลง OT ในวันนี้</p>
        )}
      </div>

      <div className="holiday-detail">
        <h3>วันหยุดประจำสัปดาห์</h3>
        {holidays.length ? (
          <div className="holiday-list">
            {holidays.map((holiday) => (
              <span key={holiday.id}>
                <i style={{ backgroundColor: holiday.member.color }} />
                {memberFullLabel(holiday.member, showEmployeeCode)}
              </span>
            ))}
          </div>
        ) : (
          <p>ไม่มีสมาชิกที่หยุดประจำวันนี้</p>
        )}
      </div>
    </section>
  );
}

function ExportDayDetailCard({
  ref,
  dateIso,
  entries,
  holidays,
}: {
  ref: React.Ref<HTMLElement>;
  dateIso: string;
  entries: OvertimeEntry[];
  holidays: WeeklyHoliday[];
}) {
  const otEntries = entries.filter((entry) => entry.entry_type === "ot" && !isHolidayCreditEntry(entry));
  const totalMinutes = otEntries.reduce((total, entry) => total + entry.total_minutes, 0);

  return (
    <section className="export-day-card" ref={ref}>
      <div className="export-report-head">
        <div>
          <span>Equipment Section 5 - OT</span>
          <h2>รายละเอียด OT วันที่ {formatDateThaiLong(dateIso)}</h2>
        </div>
        <div className="export-report-summary">
          <strong>{otEntries.length}</strong>
          <span>รายการ OT</span>
        </div>
      </div>
      <div className="export-report-metrics">
        <div>
          <span>สมาชิกที่ทำ OT</span>
          <strong>{new Set(otEntries.map((entry) => entry.member_id)).size} คน</strong>
        </div>
        <div>
          <span>ชั่วโมง OT รวม</span>
          <strong>{formatHours(totalMinutes)}</strong>
        </div>
        <div>
          <span>ไม่มาทำงาน</span>
          <strong>{entries.filter((entry) => entry.entry_type === "absent").length} คน</strong>
        </div>
      </div>
      <table className="export-detail-table">
        <thead>
          <tr>
            <th>ลำดับ</th>
            <th>รหัสพนักงาน</th>
            <th>ชื่อพนักงาน</th>
            <th>ชื่อเล่น</th>
            <th>ชื่อจีน</th>
            <th>ประเภท</th>
            <th>เวลา</th>
            <th>ชั่วโมง OT</th>
          </tr>
        </thead>
        <tbody>
          {entries.length ? (
            entries.map((entry, index) => (
              <tr key={entry.id}>
                <td>{index + 1}</td>
                <td>{entry.member.employee_code?.trim() || "-"}</td>
                <td>{entry.member.name}</td>
                <td>{entry.member.nickname?.trim() || "-"}</td>
                <td>{entry.member.chinese_name?.trim() || "-"}</td>
                <td>{entry.entry_type === "absent" ? absenceTypeLabel(entry.absence_type) : isHolidayCreditEntry(entry) ? "เก็บวันหยุด" : "OT"}</td>
                <td>
                  {entry.entry_type === "absent"
                    ? "-"
                    : isHolidayCreditEntry(entry)
                      ? "-"
                      : `${entry.start_time ?? "-"}-${entry.end_time ?? "-"}`}
                </td>
                <td>{entry.entry_type === "absent" ? "-" : formatEntryRateBreakdown(entry)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8}>ไม่มีข้อมูล OT ในวันที่เลือก</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="export-holiday-box">
        <strong>วันหยุดประจำสัปดาห์</strong>
        <span>
          {holidays.length
            ? holidays
                .map((holiday) => `${holiday.member.employee_code?.trim() || "-"} ${memberFullLabel(holiday.member, true)}`)
                .join(", ")
            : "ไม่มีสมาชิกที่หยุดประจำวันนี้"}
        </span>
      </div>
      <p className="export-generated-at">บันทึกรูปเมื่อ {formatDateDDMMYYYY(getBangkokTodayIso())}</p>
    </section>
  );
}

function OtForm({
  members,
  form,
  showEmployeeCode,
  onChange,
  onCancel,
  onSave,
}: {
  members: Member[];
  form: FormState;
  showEmployeeCode: boolean;
  onChange: (form: FormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isHoliday = form.dayType === "holiday";
  const isHolidayCredit = form.entryType === "ot" && isHoliday && !form.startTime && !form.endTime;
  const ratePreviewLabel = isHoliday ? "เรท OT วันหยุด" : "เรท OT วันปกติ";
  const ratePreview =
    form.entryType === "ot" && form.startTime && form.endTime && timeToMinutes(form.endTime) > timeToMinutes(form.startTime)
      ? calculateOtRateBreakdown(form.startTime, form.endTime, isHoliday)
      : null;
  const activeQuickOption = quickOtOptions.find(
    (option) =>
      form.startTime === option.startTime &&
      form.endTime === option.endTime &&
      form.dayType === option.dayType,
  );

  return (
    <div className="ot-form">
      <label className="form-field">
        <span>ชื่อสมาชิก</span>
        <select
          value={form.memberId}
          onChange={(event) => onChange({ ...form, memberId: event.target.value })}
        >
          <option value="">เลือกชื่อสมาชิก</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {memberFullLabel(member, showEmployeeCode)}
            </option>
          ))}
        </select>
      </label>
      <label className="form-field">
        <span>วันที่</span>
        <input
          type="date"
          value={form.otDate}
          onChange={(event) => onChange({ ...form, otDate: event.target.value })}
        />
      </label>
      <div className="entry-type-options" aria-label="ประเภทการลงข้อมูล">
        <button
          className={form.entryType === "ot" ? "active" : ""}
          type="button"
          onClick={() => onChange({ ...form, entryType: "ot" })}
        >
          ลง OT
        </button>
        <button
          className={form.entryType === "absent" ? "active absent" : ""}
          type="button"
          onClick={() => onChange({ ...form, entryType: "absent" })}
        >
          ไม่มาทำงาน
        </button>
      </div>
      {form.entryType === "ot" ? (
        <>
          <div className="quick-ot-options">
            <span>ตัวเลือกแบบด่วน</span>
            <div className="quick-ot-buttons">
              {quickOtOptions.map((option) => {
                const active = activeQuickOption === option;

                return (
                  <button
                    key={`${option.startTime}-${option.endTime}`}
                    className={`quick-ot-button${active ? " active" : ""}`}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...form,
                        dayType: option.dayType,
                        startTime: option.startTime,
                        endTime: option.endTime,
                      })
                    }
                  >
                    {option.label}
                  </button>
                );
              })}
              <button
                className={`quick-ot-button${isHolidayCredit ? " active" : ""}`}
                type="button"
                onClick={() => onChange({ ...form, dayType: "holiday", startTime: "", endTime: "" })}
              >
                6. เลือกเก็บวันหยุด
              </button>
            </div>
            <small>
              วันปกติ: หลัง 18:00 = 1.5 เท่า / วันหยุด: 08:00-17:00 = 1 เท่า, หลัง 18:00 = 3 เท่า
            </small>
          </div>
          <div className="time-grid">
            <label className="form-field">
              <span>เวลาเริ่มต้น</span>
              <input
                type="time"
                value={form.startTime}
                onChange={(event) => onChange({ ...form, startTime: event.target.value })}
              />
            </label>
            <label className="form-field">
              <span>เวลาสิ้นสุด</span>
              <input
                type="time"
                value={form.endTime}
                onChange={(event) => onChange({ ...form, endTime: event.target.value })}
              />
            </label>
          </div>
          {isHolidayCredit ? (
            <div className="rate-preview">
              <strong>เก็บวันหยุดเพิ่ม</strong>
              <span>เพิ่มวันหยุด 1 วัน / ไม่เพิ่มชั่วโมง OT</span>
            </div>
          ) : ratePreview ? (
            <div className="rate-preview">
              <strong>{ratePreviewLabel}</strong>
              <span>{formatRateBreakdown(ratePreview)}</span>
            </div>
          ) : null}
        </>
      ) : (
        <div className="absence-options">
          <span>เลือกประเภทการลา/หยุด</span>
          <div className="absence-buttons">
            {absenceOptions.map((option, index) => (
              <button
                className={form.absenceType === option.type ? "active" : ""}
                key={option.type}
                type="button"
                onClick={() => onChange({ ...form, absenceType: option.type })}
              >
                {index + 1}. {option.label}
              </button>
            ))}
          </div>
          <div className="absent-note">
            บันทึกประเภทการไม่มาทำงานในวันที่เลือก และไม่ถูกนับเป็นชั่วโมง OT
          </div>
        </div>
      )}
      <div className="modal-actions">
        <button className="btn-secondary" type="button" onClick={onCancel}>
          ยกเลิก
        </button>
        <button className="btn-primary" type="button" onClick={onSave}>
          <Check size={17} aria-hidden />
          บันทึก
        </button>
      </div>
    </div>
  );
}

function AdminPanel({
  adminCode,
  adminError,
  adminMembers,
  adminUnlocked,
  holidays,
  memberDrafts,
  newMember,
  saving,
  onAddMember,
  onAdminCodeChange,
  onMemberDraftChange,
  onNewMemberChange,
  onRemoveHoliday,
  onSaveMember,
  onSetMemberHoliday,
  onUnlock,
}: {
  adminCode: string;
  adminError: string;
  adminMembers: Member[];
  adminUnlocked: boolean;
  holidays: WeeklyHoliday[];
  memberDrafts: Record<string, MemberPayload>;
  newMember: MemberPayload;
  saving: boolean;
  onAddMember: () => void;
  onAdminCodeChange: (value: string) => void;
  onMemberDraftChange: (id: string, value: MemberPayload) => void;
  onNewMemberChange: (value: MemberPayload) => void;
  onRemoveHoliday: (id: string) => void;
  onSaveMember: (id: string) => void;
  onSetMemberHoliday: (memberId: string, weekday: number, checked: boolean) => void;
  onUnlock: () => void;
}) {
  if (!adminUnlocked) {
    return (
      <section className="section-card admin-lock">
        <SectionTitle icon={<Lock size={20} />} title="ปลดล็อกข้อมูล admin" />
        <p>การแก้ไขสมาชิกและวันหยุดประจำสัปดาห์ต้องใช้รหัส admin</p>
        <label className="form-field">
          <span>รหัส admin</span>
          <input
            type="password"
            value={adminCode}
            onChange={(event) => onAdminCodeChange(event.target.value)}
            placeholder="กรอกรหัส admin"
          />
        </label>
        {adminError ? <div className="app-alert danger-alert">{adminError}</div> : null}
        <button className="btn-primary full-button" type="button" onClick={onUnlock} disabled={saving}>
          <Lock size={17} aria-hidden />
          ปลดล็อก
        </button>
      </section>
    );
  }

  const holidaysByMember = new Map<string, Set<number>>();
  for (const holiday of holidays) {
    const current = holidaysByMember.get(holiday.member_id) ?? new Set<number>();
    current.add(holiday.weekday);
    holidaysByMember.set(holiday.member_id, current);
  }

  return (
    <section className="section-card member-sheet-card">
      <div className="sheet-title-row">
        <SectionTitle icon={<Users size={20} />} title="จัดการสมาชิก" />
        <span className="sheet-caption">รูปแบบตาราง เลือกวันหยุดในแถวสมาชิกได้ทันที</span>
      </div>
      {adminError ? <div className="app-alert danger-alert">{adminError}</div> : null}

      <div className="member-sheet-scroll">
        <table className="member-sheet">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>รหัสพนักงาน</th>
              <th>ชื่อสมาชิก</th>
              <th>ชื่อเล่น</th>
              <th>ชื่อภาษาจีน</th>
              <th>สี</th>
              <th>ใช้งาน</th>
              <th>วันหยุดประจำสัปดาห์</th>
              <th>บันทึก</th>
            </tr>
          </thead>
          <tbody>
            {adminMembers.map((member) => {
              const draft = memberDrafts[member.id];
              if (!draft) return null;
              const memberHolidaySet = holidaysByMember.get(member.id) ?? new Set<number>();

              return (
                <tr key={member.id}>
                  <td data-label="ลำดับ">
                    <input
                      className="sheet-number"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={draft.employeeNo}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          employeeNo: parseEmployeeNo(event.target.value),
                        })
                      }
                    />
                  </td>
                  <td data-label="รหัสพนักงาน">
                    <input
                      className="sheet-employee-code"
                      value={draft.employeeCode}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          employeeCode: event.target.value,
                        })
                      }
                      placeholder="เช่น 680001"
                    />
                  </td>
                  <td data-label="ชื่อสมาชิก">
                    <input
                      className="sheet-name"
                      value={draft.name}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          name: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td data-label="ชื่อเล่น">
                    <input
                      className="sheet-nickname"
                      value={draft.nickname}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          nickname: event.target.value,
                        })
                      }
                      placeholder="เช่น Nai"
                    />
                  </td>
                  <td data-label="ชื่อภาษาจีน">
                    <input
                      className="sheet-chinese"
                      value={draft.chineseName}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          chineseName: event.target.value,
                        })
                      }
                      placeholder="เช่น 你好"
                    />
                  </td>
                  <td data-label="สี">
                    <input
                      className="sheet-color"
                      type="color"
                      value={draft.color}
                      onChange={(event) =>
                        onMemberDraftChange(member.id, {
                          ...draft,
                          color: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td data-label="ใช้งาน">
                    <label className="sheet-switch">
                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          onMemberDraftChange(member.id, {
                            ...draft,
                            isActive: event.target.checked,
                          })
                        }
                      />
                      <span>{draft.isActive ? "เปิด" : "ปิด"}</span>
                    </label>
                  </td>
                  <td data-label="วันหยุดประจำสัปดาห์">
                    <div className="leave-balance-editor">
                      <label>
                        ลาป่วย
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={draft.sickLeaveRemaining}
                          onChange={(event) =>
                            onMemberDraftChange(member.id, {
                              ...draft,
                              sickLeaveRemaining: parseLeaveInput(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        ลากิจ
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={draft.personalLeaveRemaining}
                          onChange={(event) =>
                            onMemberDraftChange(member.id, {
                              ...draft,
                              personalLeaveRemaining: parseLeaveInput(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        พักร้อน
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={draft.vacationLeaveRemaining}
                          onChange={(event) =>
                            onMemberDraftChange(member.id, {
                              ...draft,
                              vacationLeaveRemaining: parseLeaveInput(event.target.value),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="weekday-picker">
                      {weekdayLabels.map((label, index) => (
                        <label
                          className={memberHolidaySet.has(index) ? "weekday-chip active" : "weekday-chip"}
                          key={`${member.id}-${label}`}
                        >
                          <input
                            type="checkbox"
                            checked={memberHolidaySet.has(index)}
                            onChange={(event) =>
                              onSetMemberHoliday(member.id, index, event.target.checked)
                            }
                            disabled={saving}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td data-label="บันทึก">
                    <button
                      className="btn-secondary sheet-save"
                      type="button"
                      onClick={() => onSaveMember(member.id)}
                      disabled={saving}
                    >
                      <Save size={16} aria-hidden />
                      บันทึก
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="add-member-row">
              <td data-label="ลำดับ">
                <input
                  className="sheet-number"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={newMember.employeeNo}
                  onChange={(event) =>
                    onNewMemberChange({
                      ...newMember,
                      employeeNo: parseEmployeeNo(event.target.value),
                    })
                  }
                />
              </td>
              <td data-label="รหัสพนักงาน">
                <input
                  className="sheet-employee-code"
                  value={newMember.employeeCode}
                  onChange={(event) =>
                    onNewMemberChange({ ...newMember, employeeCode: event.target.value })
                  }
                  placeholder="รหัสพนักงาน"
                />
              </td>
              <td data-label="ชื่อสมาชิก">
                <input
                  className="sheet-name"
                  value={newMember.name}
                  onChange={(event) =>
                    onNewMemberChange({ ...newMember, name: event.target.value })
                  }
                  placeholder="เพิ่มชื่อสมาชิกใหม่"
                />
              </td>
              <td data-label="ชื่อเล่น">
                <input
                  className="sheet-nickname"
                  value={newMember.nickname}
                  onChange={(event) =>
                    onNewMemberChange({ ...newMember, nickname: event.target.value })
                  }
                  placeholder="ชื่อเล่น"
                />
              </td>
              <td data-label="ชื่อภาษาจีน">
                <input
                  className="sheet-chinese"
                  value={newMember.chineseName}
                  onChange={(event) =>
                    onNewMemberChange({ ...newMember, chineseName: event.target.value })
                  }
                  placeholder="中文名"
                />
              </td>
              <td data-label="สี">
                <input
                  className="sheet-color"
                  type="color"
                  value={newMember.color}
                  onChange={(event) =>
                    onNewMemberChange({ ...newMember, color: event.target.value })
                  }
                />
              </td>
              <td data-label="ใช้งาน">
                <label className="sheet-switch">
                  <input
                    type="checkbox"
                    checked={newMember.isActive}
                    onChange={(event) =>
                      onNewMemberChange({ ...newMember, isActive: event.target.checked })
                    }
                  />
                  <span>{newMember.isActive ? "เปิด" : "ปิด"}</span>
                </label>
              </td>
              <td data-label="วันหยุดประจำสัปดาห์">
                <span className="sheet-note">เพิ่มสมาชิกก่อน แล้วเลือกวันหยุดในแถวสมาชิก</span>
              </td>
              <td data-label="เพิ่ม">
                <button
                  className="btn-primary sheet-save"
                  type="button"
                  onClick={onAddMember}
                  disabled={saving}
                >
                  <Plus size={16} aria-hidden />
                  เพิ่ม
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {holidays.length ? (
        <div className="holiday-summary-strip">
          {holidays.map((holiday) => (
            <button
              key={holiday.id}
              type="button"
              onClick={() => onRemoveHoliday(holiday.id)}
              disabled={saving}
              title="กดเพื่อลบวันหยุดนี้"
            >
              <span style={{ backgroundColor: holiday.member.color }} />
              {memberFullLabel(holiday.member)} - {weekdayFullLabels[holiday.weekday]}
              <Trash2 size={14} aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function DisplaySettingsPanel({
  adminCode,
  adminError,
  adminUnlocked,
  settings,
  saving,
  onAdminCodeChange,
  onChange,
  onSave,
  onUnlock,
}: {
  adminCode: string;
  adminError: string;
  adminUnlocked: boolean;
  settings: DisplaySettings;
  saving: boolean;
  onAdminCodeChange: (value: string) => void;
  onChange: (value: DisplaySettings) => void;
  onSave: () => void;
  onUnlock: () => void;
}) {
  if (!adminUnlocked) {
    return (
      <section className="section-card admin-lock">
        <SectionTitle icon={<Lock size={20} />} title="ปลดล็อกการตั้งค่า" />
        <p>การตั้งค่าการแสดงผลต้องใช้รหัส admin</p>
        <label className="form-field">
          <span>รหัส admin</span>
          <input
            type="password"
            value={adminCode}
            onChange={(event) => onAdminCodeChange(event.target.value)}
            placeholder="กรอกรหัส admin"
          />
        </label>
        {adminError ? <div className="app-alert danger-alert">{adminError}</div> : null}
        <button className="btn-primary full-button" type="button" onClick={onUnlock} disabled={saving}>
          <Lock size={17} aria-hidden />
          ปลดล็อก
        </button>
      </section>
    );
  }

  return (
    <section className="section-card display-settings-card">
      <SectionTitle icon={<Settings size={20} />} title="ตั้งค่าการแสดงผล" />
      {adminError ? <div className="app-alert danger-alert">{adminError}</div> : null}
      <div className="setting-row">
        <div>
          <strong>แสดงรหัสพนักงาน</strong>
          <p>เปิดเพื่อแสดงรหัสพนักงานใน Dropdown, รายละเอียดประจำวัน และรายงานสรุป</p>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.showEmployeeCode}
            onChange={(event) =>
              onChange({ ...settings, showEmployeeCode: event.target.checked })
            }
          />
          <span>{settings.showEmployeeCode ? "แสดง" : "ซ่อน"}</span>
        </label>
      </div>
      <div className="settings-preview">
        <span>ตัวอย่าง</span>
        <strong>
          {settings.showEmployeeCode
            ? "NITINAI YASUTORN (รหัส 680001 - Non / 林明)"
            : "NITINAI YASUTORN (Non / 林明)"}
        </strong>
      </div>
      <div className="modal-actions">
        <button className="btn-primary" type="button" onClick={onSave} disabled={saving}>
          <Save size={17} aria-hidden />
          บันทึกการตั้งค่า
        </button>
      </div>
    </section>
  );
}

function SummaryPanel({
  summary,
  compact = false,
  showEmployeeCode = false,
}: {
  summary: MonthSummary;
  compact?: boolean;
  showEmployeeCode?: boolean;
}) {
  return (
    <section className={`summary-panel ${compact ? "summary-compact" : ""}`}>
      <SectionTitle icon={<BarChart3 size={20} />} title={`สรุปประจำเดือน${summary.month_label}`} />
      <div className="summary-metrics">
        <Metric label="รายการ OT ทั้งหมด" value={`${summary.total_entries} รายการ`} />
        <Metric label="วันที่มี OT" value={`${summary.ot_days} วัน`} />
        <Metric label="สมาชิกที่ลง OT" value={`${summary.active_members} คน`} />
        <Metric label="OT1 เท่า" value={formatHours(summary.total_ot_1x_minutes ?? 0)} />
        <Metric label="OT1.5 เท่า" value={formatHours(summary.total_ot_1_5x_minutes ?? 0)} />
        <Metric label="OT3 เท่า" value={formatHours(summary.total_ot_3x_minutes ?? 0)} />
        <Metric label="OT ทั้งหมด" value={formatHours(summary.total_minutes)} />
      </div>
      <div className="member-total-list">
        {summary.by_member.length ? (
          summary.by_member.map((member) => (
            <div className="member-total" key={member.member_id}>
              <span className="member-total-dot" style={{ backgroundColor: member.color }} />
              <div className="member-total-person">
                <strong>{member.name}</strong>
                {memberHoursSecondaryLabel(member, showEmployeeCode) ? (
                  <small>{memberHoursSecondaryLabel(member, showEmployeeCode)}</small>
                ) : null}
              </div>
              <div className="member-total-rates">
                <span>
                  <b>OT1</b>
                  <em>{formatHours(member.ot_1x_minutes)}</em>
                </span>
                <span>
                  <b>OT1.5</b>
                  <em>{formatHours(member.ot_1_5x_minutes)}</em>
                </span>
                <span>
                  <b>OT3</b>
                  <em>{formatHours(member.ot_3x_minutes)}</em>
                </span>
                <span className="total">
                  <b>รวม</b>
                  <em>{formatHours(member.total_minutes)}</em>
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="empty-state">ยังไม่มีข้อมูล OT ในเดือนนี้</p>
        )}
      </div>
    </section>
  );
}

function LeaveInfoPanel({
  monthLabelText,
  rows,
  showEmployeeCode,
}: {
  monthLabelText: string;
  rows: LeaveInfoRow[];
  showEmployeeCode: boolean;
}) {
  const totals = rows.reduce(
    (current, row) => ({
      addedHolidayDays: current.addedHolidayDays + row.addedHolidayDays,
      sickLeave: current.sickLeave + row.sickLeaveRemaining,
      personalLeave: current.personalLeave + row.personalLeaveRemaining,
      vacationLeave: current.vacationLeave + row.vacationLeaveRemaining,
    }),
    { addedHolidayDays: 0, sickLeave: 0, personalLeave: 0, vacationLeave: 0 },
  );

  return (
    <section className="section-card leave-info-panel">
      <SectionTitle icon={<CalendarCheck size={20} />} title={`ข้อมูลวันหยุด ${monthLabelText}`} />
      <div className="summary-metrics">
        <Metric label="วันหยุดเพิ่มรวม" value={formatLeaveDays(totals.addedHolidayDays)} />
        <Metric label="ลาป่วยคงเหลือรวม" value={formatLeaveDays(totals.sickLeave)} />
        <Metric label="ลากิจคงเหลือรวม" value={formatLeaveDays(totals.personalLeave)} />
        <Metric label="พักร้อนคงเหลือรวม" value={formatLeaveDays(totals.vacationLeave)} />
      </div>

      <div className="leave-table-scroll">
        <table className="leave-table">
          <thead>
            <tr>
              <th>รหัสพนักงาน</th>
              <th>ชื่อ</th>
              <th>วันหยุดเพิ่ม</th>
              <th>ลาป่วยที่เหลือ</th>
              <th>ลากิจที่เหลือ</th>
              <th>ลาพักร้อนที่เหลือ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.member.id}>
                <td data-label="รหัสพนักงาน">{row.member.employee_code?.trim() || "-"}</td>
                <td data-label="ชื่อ">
                  <div className="leave-member-name">
                    <span style={{ backgroundColor: row.member.color }} />
                    <strong>{memberFullLabel(row.member, showEmployeeCode)}</strong>
                  </div>
                </td>
                <td data-label="วันหยุดเพิ่ม">
                  <strong>{formatLeaveDays(row.addedHolidayDays)}</strong>
                  {row.addedHolidayDays ? <small>จากการเลือกเก็บวันหยุด</small> : null}
                  {row.compensatoryLeaveUsed ? <small>ใช้ชดเชยแล้ว {formatLeaveDays(row.compensatoryLeaveUsed)}</small> : null}
                </td>
                <td data-label="ลาป่วยที่เหลือ">
                  {formatLeaveDays(row.sickLeaveRemaining)}
                  {row.sickLeaveUsed ? <small>ใช้แล้ว {formatLeaveDays(row.sickLeaveUsed)}</small> : null}
                </td>
                <td data-label="ลากิจที่เหลือ">
                  {formatLeaveDays(row.personalLeaveRemaining)}
                  {row.personalLeaveUsed ? <small>ใช้แล้ว {formatLeaveDays(row.personalLeaveUsed)}</small> : null}
                </td>
                <td data-label="ลาพักร้อนที่เหลือ">
                  {formatLeaveDays(row.vacationLeaveRemaining)}
                  {row.vacationLeaveUsed ? <small>ใช้แล้ว {formatLeaveDays(row.vacationLeaveUsed)}</small> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ConfirmSaveModal({
  error,
  member,
  payload,
  saving,
  showEmployeeCode,
  onBack,
  onConfirm,
}: {
  error: string;
  member?: Member;
  payload: OvertimePayload;
  saving: boolean;
  showEmployeeCode: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const isAbsent = payload.entryType === "absent";

  return (
    <Modal onClose={onBack}>
      <div className="modal-header">
        <div>
          <h2>{isAbsent ? "ยืนยันไม่มาทำงาน" : "ยืนยันการลง OT"}</h2>
          <p>ตรวจสอบข้อมูลก่อนบันทึก</p>
        </div>
      </div>
      <div className="confirm-box">
        <p>
          <strong>ชื่อ:</strong> {member ? memberFullLabel(member, showEmployeeCode) : "-"}
        </p>
        <p>
          <strong>วันที่:</strong> {formatDateDDMMYYYY(payload.otDate)}
        </p>
        {isAbsent ? (
          <p>
            <strong>สถานะ:</strong> {absenceTypeLabel(payload.absenceType)}
          </p>
        ) : (
          <p>
            <strong>{isHolidayCreditPayload(payload) ? "สถานะ" : "เวลา"}:</strong>{" "}
            {isHolidayCreditPayload(payload) ? "เก็บวันหยุดเพิ่ม 1 วัน" : `${payload.startTime}-${payload.endTime}`}
          </p>
        )}
      </div>
      {error ? <div className="app-alert danger-alert">{error}</div> : null}
      <div className="modal-actions">
        <button className="btn-secondary" type="button" onClick={onBack} disabled={saving}>
          กลับไปแก้ไข
        </button>
        <button className="btn-primary" type="button" onClick={onConfirm} disabled={saving}>
          <Check size={17} aria-hidden />
          ยืนยัน
        </button>
      </div>
    </Modal>
  );
}

function ConfirmDeleteModal({
  entry,
  saving,
  showEmployeeCode,
  onCancel,
  onConfirm,
}: {
  entry: OvertimeEntry;
  saving: boolean;
  showEmployeeCode: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isAbsent = entry.entry_type === "absent";

  return (
    <Modal onClose={onCancel}>
      <div className="modal-header">
        <div>
          <h2>ต้องการลบข้อมูล{isAbsent ? "ไม่มาทำงาน" : " OT"} นี้หรือไม่?</h2>
          <p>ข้อมูลที่ลบแล้วไม่สามารถกู้คืนจากหน้าจอนี้ได้</p>
        </div>
      </div>
      <div className="confirm-box">
        <p>
          <strong>ชื่อ:</strong> {memberFullLabel(entry.member, showEmployeeCode)}
        </p>
        <p>
          <strong>วันที่:</strong> {formatDateDDMMYYYY(entry.ot_date)}
        </p>
        {isAbsent ? (
          <p>
            <strong>สถานะ:</strong> {absenceTypeLabel(entry.absence_type)}
          </p>
        ) : (
          <p>
            <strong>{isHolidayCreditEntry(entry) ? "สถานะ" : "เวลา"}:</strong>{" "}
            {isHolidayCreditEntry(entry) ? "เก็บวันหยุดเพิ่ม 1 วัน" : `${entry.start_time}-${entry.end_time}`}
          </p>
        )}
      </div>
      <div className="modal-actions">
        <button className="btn-secondary" type="button" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </button>
        <button className="btn-danger" type="button" onClick={onConfirm} disabled={saving}>
          <Trash2 size={17} aria-hidden />
          ยืนยันการลบ
        </button>
      </div>
    </Modal>
  );
}

function BottomNav({
  activeTab,
  onChange,
}: {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}) {
  const items: Array<{ tab: ActiveTab; label: string; icon: React.ReactNode }> = [
    { tab: "leave", label: "วันหยุด", icon: <CalendarCheck size={22} /> },
    { tab: "calendar", label: "ปฏิทิน OT", icon: <CalendarDays size={22} /> },
    { tab: "register", label: "ลงทะเบียน", icon: <Plus size={22} /> },
    { tab: "report", label: "รายงาน", icon: <BarChart3 size={22} /> },
    { tab: "members", label: "สมาชิก", icon: <Users size={22} /> },
  ];

  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      {items.map((item) => (
        <button
          className={activeTab === item.tab ? "active" : ""}
          key={item.tab}
          type="button"
          onClick={() => onChange(item.tab)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="section-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="modal-panel" onMouseDown={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function validateClientForm(form: FormState): OvertimePayload {
  if (!form.memberId) throw new Error("กรุณาเลือกชื่อสมาชิก");
  if (!form.otDate) throw new Error("กรุณาเลือกวันที่");

  if (form.entryType === "absent") {
    return {
      memberId: form.memberId,
      otDate: form.otDate,
      entryType: "absent",
      absenceType: form.absenceType,
    };
  }

  if (form.dayType === "holiday" && !form.startTime && !form.endTime) {
    return {
      memberId: form.memberId,
      otDate: form.otDate,
      entryType: "ot",
      dayType: "holiday",
    };
  }

  if (!form.startTime) throw new Error("กรุณากรอกเวลาเริ่มต้น");
  if (!form.endTime) throw new Error("กรุณากรอกเวลาสิ้นสุด");

  const elapsedMinutes = timeToMinutes(form.endTime) - timeToMinutes(form.startTime);
  if (elapsedMinutes <= 0) throw new Error("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น");

  const breakdown = calculateOtRateBreakdown(form.startTime, form.endTime, form.dayType === "holiday");
  if (breakdown.totalMinutes <= 0) {
    throw new Error("ช่วงเวลานี้ยังไม่มีชั่วโมง OT ที่นับได้ ระบบเริ่มนับ OT หลัง 18:00");
  }

  return {
    memberId: form.memberId,
    otDate: form.otDate,
    entryType: "ot",
    dayType: form.dayType,
    startTime: form.startTime,
    endTime: form.endTime,
  };
}

function buildChatExportText(dateIso: string, entries: OvertimeEntry[]) {
  const lines = entries
    .filter((entry) => entry.entry_type === "ot" && !isHolidayCreditEntry(entry))
    .map((entry) =>
      [
        entry.member.employee_code?.trim() || "-",
        entry.member.name.trim(),
        entry.member.chinese_name?.trim() || "-",
      ].join(" "),
    );

  if (!lines.length) return `OT ${formatDateDDMMYYYY(dateIso)}\nไม่มีสมาชิกทำ OT`;
  return [`OT ${formatDateDDMMYYYY(dateIso)}`, ...lines].join("\n");
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Copy failed");
}

async function downloadElementAsPng(element: HTMLElement, filename: string) {
  const html2canvas = (await import("html2canvas")).default;
  const rect = element.getBoundingClientRect();
  const width = Math.ceil(element.scrollWidth || rect.width);
  const height = Math.ceil(element.scrollHeight || rect.height);
  const cloned = element.cloneNode(true) as HTMLElement;
  cloned.style.width = `${width}px`;
  cloned.style.maxWidth = "none";
  cloned.style.margin = "0";
  cloned.style.minHeight = `${height}px`;
  cloned.style.opacity = "1";
  cloned.style.transform = "none";

  const renderRoot = document.createElement("div");
  renderRoot.style.position = "fixed";
  renderRoot.style.top = "0";
  renderRoot.style.left = "0";
  renderRoot.style.zIndex = "-1";
  renderRoot.style.width = `${width}px`;
  renderRoot.style.background = "#ffffff";
  renderRoot.style.pointerEvents = "none";
  renderRoot.appendChild(cloned);
  document.body.appendChild(renderRoot);

  try {
    await waitForPaint();
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const canvas = await html2canvas(cloned, {
      backgroundColor: "#ffffff",
      height,
      logging: false,
      scale,
      useCORS: true,
      width,
      windowHeight: height,
      windowWidth: width,
    });
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Cannot create image"));
      }, "image/png");
    });
    const pngUrl = URL.createObjectURL(pngBlob);
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(pngUrl);
  } finally {
    renderRoot.remove();
  }
}

function downloadElementAsHtml(element: HTMLElement, filename: string) {
  const cloned = element.cloneNode(true) as HTMLElement;
  const styles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
  const html = `<!doctype html>
    <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Equipment Section 5 - OT</title>
        <style>
          ${styles}
          body { margin: 24px; background: #eef6ff; font-family: Arial, sans-serif; }
          .export-day-card { margin: 0 auto; }
        </style>
      </head>
      <body>${cloned.outerHTML}</body>
    </html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function waitForPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function buildCalendarDays(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDate = new Date(year, monthIndex - 1, 1);
  const firstWeekday = firstDate.getDay();
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const daysInPreviousMonth = new Date(year, monthIndex - 1, 0).getDate();
  const cells = 42;

  return Array.from({ length: cells }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;
    let currentYear = year;
    let currentMonth = monthIndex;
    let day = dayOffset;
    let inMonth = true;

    if (dayOffset <= 0) {
      currentMonth = monthIndex - 1;
      if (currentMonth === 0) {
        currentMonth = 12;
        currentYear -= 1;
      }
      day = daysInPreviousMonth + dayOffset;
      inMonth = false;
    } else if (dayOffset > daysInMonth) {
      currentMonth = monthIndex + 1;
      if (currentMonth === 13) {
        currentMonth = 1;
        currentYear += 1;
      }
      day = dayOffset - daysInMonth;
      inMonth = false;
    }

    const iso = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    const weekday = new Date(currentYear, currentMonth - 1, day).getDay();

    return {
      iso,
      day,
      inMonth,
      isWeekend: weekday === 0 || weekday === 6,
      isToday: iso === getBangkokTodayIso(),
    };
  });
}

function buildWeekDays(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const selected = new Date(year, month - 1, day);
  const start = new Date(selected);
  start.setDate(selected.getDate() - selected.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const iso = toIsoDate(current);
    const currentMonth = current.getMonth() + 1;
    const selectedMonthIndex = month;

    return {
      iso,
      day: current.getDate(),
      inMonth: currentMonth === selectedMonthIndex,
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
      isToday: iso === getBangkokTodayIso(),
    };
  });
}

function holidaysForDate(holidays: WeeklyHoliday[], dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  return holidays
    .filter((holiday) => holiday.weekday === weekday)
    .sort(compareWeeklyHolidaysByMemberOrder);
}

function compareOvertimeEntriesByMemberOrder(a: OvertimeEntry, b: OvertimeEntry) {
  const categoryDiff = getCalendarEntryCategory(a) - getCalendarEntryCategory(b);
  if (categoryDiff !== 0) return categoryDiff;

  const memberOrder = compareMembersBySystemOrder(a.member, b.member);
  if (memberOrder !== 0) return memberOrder;
  return (a.start_time ?? "").localeCompare(b.start_time ?? "");
}

function getCalendarEntryCategory(entry: OvertimeEntry) {
  if (entry.entry_type === "ot" && !isHolidayCreditEntry(entry)) return 0;
  if (isHolidayCreditEntry(entry)) return 1;
  return 2;
}

function compareWeeklyHolidaysByMemberOrder(a: WeeklyHoliday, b: WeeklyHoliday) {
  return compareMembersBySystemOrder(a.member, b.member);
}

function compareMembersBySystemOrder(
  a: Pick<Member, "employee_no" | "name">,
  b: Pick<Member, "employee_no" | "name">,
) {
  const orderDiff = a.employee_no - b.employee_no;
  if (orderDiff !== 0) return orderDiff;
  return a.name.localeCompare(b.name, "en");
}

function shiftMonth(month: string, diff: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const next = new Date(year, monthIndex - 1 + diff, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function shiftDate(dateIso: string, diffDays: number) {
  const [year, month, day] = dateIso.split("-").map(Number);
  const next = new Date(year, month - 1, day + diffDays);
  return toIsoDate(next);
}

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return `${thaiMonths[monthIndex - 1]} ${year}`;
}

function formatDateThaiLong(dateIso: string) {
  const [year, month, day] = dateIso.split("-").map(Number);
  return `${day} ${thaiMonths[month - 1]} ${year}`;
}

function formatWeekRangeShort(startIso: string, endIso: string) {
  const [startYear, startMonth, startDay] = startIso.split("-").map(Number);
  const [endYear, endMonth, endDay] = endIso.split("-").map(Number);

  if (startYear === endYear && startMonth === endMonth) {
    return `${startDay}-${endDay} ${thaiShortMonths[startMonth - 1]} ${startYear}`;
  }

  return `${startDay}/${String(startMonth).padStart(2, "0")}/${startYear} - ${endDay}/${String(
    endMonth,
  ).padStart(2, "0")}/${endYear}`;
}

function formatDateDDMMYYYY(dateIso: string) {
  const [year, month, day] = dateIso.split("-");
  return `${day}/${month}/${year}`;
}

function formatHours(totalMinutes: number) {
  const hours = totalMinutes / 60;
  return Number.isInteger(hours)
    ? `${hours} ชม.`
    : `${hours.toFixed(2).replace(/\.?0+$/, "")} ชม.`;
}

function formatLeaveDays(value?: number | null) {
  const days = Number(value ?? 0);
  const label = Number.isInteger(days) ? String(days) : days.toFixed(2).replace(/\.?0+$/, "");
  return `${label} วัน`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateOtRateBreakdown(startTime: string, endTime: string, isHoliday: boolean) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (!isHoliday) {
    const ot15xMinutes = Math.max(0, end - Math.max(start, 18 * 60));
    return {
      dayType: "regular" as const,
      totalMinutes: ot15xMinutes,
      ot1xMinutes: 0,
      ot15xMinutes,
      ot3xMinutes: 0,
    };
  }

  const ot1xMinutes =
    overlapMinutes(start, end, 8 * 60, 12 * 60) + overlapMinutes(start, end, 13 * 60, 17 * 60);
  const ot3xMinutes = Math.max(0, end - Math.max(start, 18 * 60));

  return {
    dayType: "holiday" as const,
    totalMinutes: ot1xMinutes + ot3xMinutes,
    ot1xMinutes,
    ot15xMinutes: 0,
    ot3xMinutes,
  };
}

function overlapMinutes(start: number, end: number, windowStart: number, windowEnd: number) {
  return Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart));
}

function formatRateBreakdown(breakdown: {
  totalMinutes: number;
  ot1xMinutes: number;
  ot15xMinutes: number;
  ot3xMinutes: number;
}) {
  const parts = [
    breakdown.ot1xMinutes > 0 ? `OT1 เท่า ${formatHours(breakdown.ot1xMinutes)}` : "",
    breakdown.ot15xMinutes > 0 ? `OT1.5 เท่า ${formatHours(breakdown.ot15xMinutes)}` : "",
    breakdown.ot3xMinutes > 0 ? `OT3 เท่า ${formatHours(breakdown.ot3xMinutes)}` : "",
  ].filter(Boolean);

  if (!parts.length) return "ยังไม่มีชั่วโมง OT ที่นับได้";
  return `${parts.join(" + ")} | OT ทั้งหมด ${formatHours(breakdown.totalMinutes)}`;
}

function formatEntryRateBreakdown(entry: OvertimeEntry) {
  if (isHolidayCreditEntry(entry)) return "เก็บวันหยุดเพิ่ม 1 วัน";

  return formatRateBreakdown({
    totalMinutes: entry.total_minutes,
    ot1xMinutes: entry.ot_1x_minutes,
    ot15xMinutes: entry.ot_1_5x_minutes,
    ot3xMinutes: entry.ot_3x_minutes,
  });
}

function isHolidayCreditEntry(entry: OvertimeEntry) {
  return (
    entry.entry_type === "ot" &&
    entry.day_type === "holiday" &&
    !entry.start_time &&
    !entry.end_time &&
    entry.total_minutes === 0
  );
}

function isHolidayCreditPayload(payload: OvertimePayload) {
  return (
    payload.entryType === "ot" &&
    payload.dayType === "holiday" &&
    !payload.startTime &&
    !payload.endTime
  );
}

function getBangkokTodayIso() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildClientSummary(entries: OvertimeEntry[], month: string): MonthSummary {
  const otEntries = entries.filter((entry) => entry.entry_type === "ot" && !isHolidayCreditEntry(entry));
  const days = new Set(otEntries.map((entry) => entry.ot_date));
  const members = new Map<
    string,
    {
      employee_no: number;
      name: string;
      employee_code?: string | null;
      nickname?: string | null;
      chinese_name?: string | null;
      color: string;
      total_minutes: number;
      ot_1x_minutes: number;
      ot_1_5x_minutes: number;
      ot_3x_minutes: number;
    }
  >();

  for (const entry of otEntries) {
    const current = members.get(entry.member_id) ?? {
      employee_no: entry.member.employee_no,
      name: entry.member.name,
      employee_code: entry.member.employee_code,
      nickname: entry.member.nickname,
      chinese_name: entry.member.chinese_name,
      color: entry.member.color,
      total_minutes: 0,
      ot_1x_minutes: 0,
      ot_1_5x_minutes: 0,
      ot_3x_minutes: 0,
    };
    current.total_minutes += entry.total_minutes;
    current.ot_1x_minutes += entry.ot_1x_minutes;
    current.ot_1_5x_minutes += entry.ot_1_5x_minutes;
    current.ot_3x_minutes += entry.ot_3x_minutes;
    members.set(entry.member_id, current);
  }

  return {
    month_label: monthLabel(month),
    ot_days: days.size,
    total_entries: otEntries.length,
    active_members: members.size,
    total_minutes: otEntries.reduce((total, entry) => total + entry.total_minutes, 0),
    total_ot_1x_minutes: otEntries.reduce((total, entry) => total + entry.ot_1x_minutes, 0),
    total_ot_1_5x_minutes: otEntries.reduce((total, entry) => total + entry.ot_1_5x_minutes, 0),
    total_ot_3x_minutes: otEntries.reduce((total, entry) => total + entry.ot_3x_minutes, 0),
    by_member: Array.from(members.entries())
      .map(([member_id, value]) => ({ member_id, ...value }))
      .sort((a, b) => a.employee_no - b.employee_no),
  };
}

function buildLeaveInfoRows(members: Member[], entries: OvertimeEntry[]): LeaveInfoRow[] {
  const holidayCreditsByMember = new Map<string, number>();
  const absenceDaysByMember = new Map<
    string,
    Record<OvertimeAbsenceType, number>
  >();

  for (const entry of entries) {
    if (isHolidayCreditEntry(entry)) {
      holidayCreditsByMember.set(
        entry.member_id,
        (holidayCreditsByMember.get(entry.member_id) ?? 0) + 1,
      );
      continue;
    }

    if (entry.entry_type === "absent") {
      const current = absenceDaysByMember.get(entry.member_id) ?? emptyAbsenceDayCounts();
      const absenceType = entry.absence_type ?? "sixth_day_off";
      current[absenceType] += 1;
      absenceDaysByMember.set(entry.member_id, current);
    }
  }

  return members.map((member) => {
    const holidayCreditDays = holidayCreditsByMember.get(member.id) ?? 0;
    const absenceDays = absenceDaysByMember.get(member.id) ?? emptyAbsenceDayCounts();
    const compensatoryLeaveUsed = absenceDays.compensatory_leave;

    return {
      member,
      holidayOtMinutes: 0,
      addedHolidayDays: Math.max(0, holidayCreditDays - compensatoryLeaveUsed),
      sixthDayOffUsed: absenceDays.sixth_day_off,
      compensatoryLeaveUsed,
      sickLeaveUsed: absenceDays.sick_leave,
      personalLeaveUsed: absenceDays.personal_leave,
      vacationLeaveUsed: absenceDays.vacation_leave,
      sickLeaveRemaining: remainingLeaveDays(member.sick_leave_remaining, absenceDays.sick_leave),
      personalLeaveRemaining: remainingLeaveDays(member.personal_leave_remaining, absenceDays.personal_leave),
      vacationLeaveRemaining: remainingLeaveDays(member.vacation_leave_remaining, absenceDays.vacation_leave),
    };
  });
}

function emptyAbsenceDayCounts(): Record<OvertimeAbsenceType, number> {
  return {
    sixth_day_off: 0,
    personal_leave: 0,
    sick_leave: 0,
    vacation_leave: 0,
    compensatory_leave: 0,
  };
}

function remainingLeaveDays(totalDays: number, usedDays: number) {
  return Math.max(0, Number(totalDays ?? 0) - usedDays);
}

function memberCalendarName(member: Member) {
  const names = [member.nickname, member.chinese_name]
    .map((value) => value?.trim())
    .filter(Boolean);
  return names.length ? names.join(" / ") : member.name;
}

function memberSecondaryLabel(member: Member, showEmployeeCode = false) {
  const employeeCode = showEmployeeCode ? formatEmployeeCode(member.employee_code) : "";
  const names = [member.nickname, member.chinese_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" / ");
  return [employeeCode, names].filter(Boolean).join(" - ");
}

function absenceTypeLabel(type?: OvertimeAbsenceType | null) {
  return absenceOptions.find((option) => option.type === (type ?? "sixth_day_off"))?.label ?? "ไม่มาทำงาน";
}

function memberFullLabel(member: Member, showEmployeeCode = false) {
  const secondary = memberSecondaryLabel(member, showEmployeeCode);
  return secondary ? `${member.name} (${secondary})` : member.name;
}

function memberHoursSecondaryLabel(member: MemberHours, showEmployeeCode = false) {
  const employeeCode = showEmployeeCode ? formatEmployeeCode(member.employee_code) : "";
  const names = [member.nickname, member.chinese_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" / ");
  return [employeeCode, names].filter(Boolean).join(" - ");
}

function formatEmployeeCode(value?: string | null) {
  const code = value?.trim();
  return code ? `รหัส ${code}` : "";
}

function parseEmployeeNo(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function parseLeaveInput(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function addAlpha(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
