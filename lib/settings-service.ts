import type { SupabaseClient } from "@supabase/supabase-js";
import { getDatabaseErrorMessage, isSchemaOutdatedError } from "./supabase-error";
import type { DisplaySettings } from "./types";

const SETTINGS_ID = "main";

type RawDisplaySettings = {
  show_employee_code: boolean;
};

export const defaultDisplaySettings: DisplaySettings = {
  showEmployeeCode: true,
};

export async function fetchDisplaySettings(supabase: SupabaseClient): Promise<DisplaySettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("show_employee_code")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    if (isSchemaOutdatedError(error)) return defaultDisplaySettings;
    throw new Error(getDatabaseErrorMessage(error, "ไม่สามารถดึงข้อมูลการตั้งค่าได้"));
  }

  const settings = data as RawDisplaySettings | null;
  return {
    showEmployeeCode: settings?.show_employee_code ?? defaultDisplaySettings.showEmployeeCode,
  };
}

export async function updateDisplaySettings(
  supabase: SupabaseClient,
  payload: Partial<DisplaySettings>,
) {
  const showEmployeeCode = Boolean(payload.showEmployeeCode);
  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: SETTINGS_ID,
        show_employee_code: showEmployeeCode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("show_employee_code")
    .single();

  if (error) throw new Error("ไม่สามารถบันทึกการตั้งค่าได้");

  const settings = data as RawDisplaySettings;
  return {
    showEmployeeCode: settings.show_employee_code,
  };
}
