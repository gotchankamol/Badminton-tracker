"use client";

import { useCallback, useRef, useState } from "react";
import * as actions from "@/lib/actions";
import { useAppState } from "@/lib/use-app-state";
import { useSoundSettings } from "@/lib/use-sound-settings";
import type { AppState } from "@/lib/types";
import Header from "./Header";
import RosterCard from "./RosterCard";
import ShuttlesTab from "./ShuttlesTab";
import SummaryTab from "./SummaryTab";
import SettingsModal from "./SettingsModal";
import HistoryModal from "./HistoryModal";
import ExportModal, { type ExportMode } from "./ExportModal";
import BackupModal, { type BackupMode } from "./BackupModal";
import RosterListModal, { type RosterListMode } from "./RosterListModal";
import ConfirmModal, { type ConfirmRequest } from "./ConfirmModal";
import PromptModal, { type PromptRequest } from "./PromptModal";
import Toast from "./Toast";
import Confetti from "./Confetti";
import RoundEndCelebration from "./RoundEndCelebration";

export default function AppClient({ initialState }: { initialState: AppState }) {
  const sound = useSoundSettings();

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    sound.play("notify");
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, [sound]);

  const { state, run, runBlocked, undo, redo, canUndo, canRedo } = useAppState(initialState, showToast);

  const [tab, setTab] = useState<"shuttles" | "summary">("shuttles");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>(null);
  const [backupMode, setBackupMode] = useState<BackupMode>(null);
  const [rosterListMode, setRosterListMode] = useState<RosterListMode>(null);

  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [promptRequest, setPromptRequest] = useState<PromptRequest | null>(null);
  const [showRoundEnd, setShowRoundEnd] = useState(false);

  const customConfirm = useCallback((message: string) => {
    sound.play("notify");
    return new Promise<boolean>((resolve) => {
      setConfirmRequest({ message, resolve: (v) => { setConfirmRequest(null); resolve(v); } });
    });
  }, [sound]);

  const customPrompt = useCallback((title: string, defaultValue: string) => {
    sound.play("notify");
    return new Promise<string | null>((resolve) => {
      setPromptRequest({ title, defaultValue, resolve: (v) => { setPromptRequest(null); resolve(v); } });
    });
  }, [sound]);

  async function handleAddPlayer(name: string) {
    await run(() => actions.addRosterPlayer(name));
  }

  async function handleEditPlayer(id: number) {
    const p = state.roster.find((pl) => pl.id === id);
    if (!p) return;
    const newName = await customPrompt("แก้ไขชื่อผู้เล่น", p.name);
    if (newName === null) return;
    if (!newName.trim()) { showToast("กรุณาใส่ชื่อ"); return; }
    await run(() => actions.editRosterPlayer(id, newName));
  }

  async function handleDeletePlayer(id: number) {
    const p = state.roster.find((pl) => pl.id === id);
    if (!p) return;
    const usedIn = state.shuttles.some((s) => s.playerIds.includes(id));
    if (usedIn) {
      const ok = await customConfirm("ชื่อนี้เคยถูกใช้ในบันทึกลูกแบดแล้ว ลบออกจากคลังจะเอาชื่อออกจากลูกเหล่านั้นด้วย ต้องการลบใช่ไหม?");
      if (!ok) return;
    }
    await run(() => actions.deleteRosterPlayer(id));
  }

  async function handleClearToday() {
    if (state.roster.filter((p) => p.isToday).length === 0) return;
    const result = await runBlocked(() => actions.clearToday());
    if (result && result.blockedNames.length > 0) {
      showToast(`ล้างรายชื่อบางส่วนไม่ได้เพราะยังไม่ได้จ่ายเงิน: ${result.blockedNames.join(", ")}`);
    }
  }

  async function handleDeleteShuttle(id: number, orderIndex: number) {
    const ok = await customConfirm(`ลบรายการที่ ${orderIndex} ใช่ไหม? แก้ไขรายชื่อไม่ได้แล้ว ต้องลบแล้วบันทึกใหม่เท่านั้น`);
    if (!ok) return;
    await run(() => actions.deleteShuttle(id));
  }

  async function handleUpdateSettings(price: number, maxShuttleNumber: number, dayResetHour: number, dayResetEnabled: boolean) {
    await run(() => actions.updateSettings(price, maxShuttleNumber, dayResetHour, dayResetEnabled));
  }

  async function handleEndRound() {
    const ok = await customConfirm(
      "จบรอบนี้แล้วเริ่มรอบใหม่? รายชื่อ \"อยู่ในสนาม/กลับแล้ว\" จะถูกล้าง และแท็บลูกแบด/สรุปเงินจะเริ่มนับใหม่จากศูนย์ — ข้อมูลลูกแบดและยอดจ่ายเดิมยังอยู่ครบ ดูย้อนหลังได้เสมอ"
    );
    if (!ok) return;
    const result = await run(() => actions.endRound());
    if (result) {
      setShowRoundEnd(true);
      sound.play("roundEnd");
    }
  }

  async function handleImportBackup(json: string) {
    await run(() => actions.importBackup(json));
    showToast("นำเข้าข้อมูลสำเร็จ");
  }

  async function handleImportRosterNames(names: string[]) {
    let added = 0;
    let skipped: string[] = [];
    await run(async () => {
      const result = await actions.importRosterNames(names);
      added = result.added;
      skipped = result.skipped;
      return result.state;
    });
    return { added, skipped };
  }

  function handleClickCapture(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, select, .chip, .tab, .toggle-chip, .num-tile.used, .link, .roster-del")) {
      sound.play("click");
    }
  }

  // Native <select> dropdowns don't reliably bubble a click when an option is
  // actually chosen (the option list is OS-rendered) — "change" is what fires
  // for real, so that's what needs the sound, on top of the tap-to-open click above.
  function handleChangeCapture(e: React.ChangeEvent) {
    const target = e.target as HTMLElement;
    if (target.tagName === "SELECT") {
      sound.play("click");
    }
  }

  return (
    <div className="wrap" onClickCapture={handleClickCapture} onChangeCapture={handleChangeCapture}>
      <Confetti />
      <Header onOpenSettings={() => setSettingsOpen(true)} />

      <div className="fab-group">
        <button id="undoBtn" className="fab-btn" title="ย้อนกลับ" disabled={!canUndo} onClick={undo}>↶</button>
        <button id="redoBtn" className="fab-btn" title="ทำซ้ำ" disabled={!canRedo} onClick={redo}>↷</button>
      </div>

      <RosterCard
        state={state}
        onAddPlayer={handleAddPlayer}
        onEditPlayer={handleEditPlayer}
        onDeletePlayer={handleDeletePlayer}
        onSetPresent={(id) => run(() => actions.setPresentToday(id))}
        onAddAllPresent={() => run(() => actions.addAllPresentToday())}
        onRemoveToday={(id) => run(() => actions.removeFromToday(id))}
        onClearToday={handleClearToday}
      />

      <div className="tabs">
        <div className={`tab tab-shuttles${tab === "shuttles" ? " active" : ""}`} onClick={() => setTab("shuttles")}>
          <span className="tab-icon">🏸</span><span>ลูกแบด</span>
        </div>
        <div className={`tab tab-summary${tab === "summary" ? " active" : ""}`} onClick={() => setTab("summary")}>
          <span className="tab-icon">💰</span><span>สรุปเงิน</span>
        </div>
      </div>

      {tab === "shuttles" ? (
        <ShuttlesTab
          state={state}
          onAddShuttle={(number, shares) => run(() => actions.addShuttle(number, shares))}
          onDeleteShuttle={handleDeleteShuttle}
          onAddNumberToShuttle={(shuttleId, number) => run(() => actions.addNumberToShuttle(shuttleId, number))}
          showToast={showToast}
        />
      ) : (
        <SummaryTab state={state} onPay={(id) => run(() => actions.payPlayer(id))} />
      )}

      <div className="note">
        เลือกคนที่มาเล่นวันนี้ด้านบนก่อน แล้วค่อยเพิ่มลูกในแท็บ &quot;ลูกแบด&quot; ระบบจะให้เลือกเฉพาะคนที่มาวันนี้เท่านั้น · ใช้ปุ่ม ↶ ↷ มุมขวาล่างเพื่อย้อนกลับ/ทำซ้ำ · ทุกคนที่เปิดลิงก์นี้เห็นข้อมูลชุดเดียวกัน
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        state={state}
        onUpdateSettings={handleUpdateSettings}
        onEndRound={handleEndRound}
        onOpenHistory={() => { setSettingsOpen(false); setHistoryOpen(true); }}
        onExportText={() => setExportMode("text")}
        onExportImage={() => setExportMode("image")}
        onExportCsv={() => setExportMode("csv")}
        onOpenBackupExport={() => setBackupMode("export")}
        onOpenBackupImport={() => setBackupMode("import")}
        onOpenRosterExport={() => setRosterListMode("export")}
        onOpenRosterImport={() => setRosterListMode("import")}
        sound={sound}
      />
      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} state={state} showToast={showToast} />
      <ExportModal mode={exportMode} onClose={() => setExportMode(null)} state={state} showToast={showToast} />
      <BackupModal
        mode={backupMode}
        onClose={() => setBackupMode(null)}
        state={state}
        onImport={handleImportBackup}
        showToast={showToast}
        onConfirm={customConfirm}
      />
      <RosterListModal
        mode={rosterListMode}
        onClose={() => setRosterListMode(null)}
        state={state}
        onImport={handleImportRosterNames}
        showToast={showToast}
      />
      <ConfirmModal request={confirmRequest} />
      <PromptModal request={promptRequest} />
      <Toast message={toast} />
      <RoundEndCelebration show={showRoundEnd} onDone={() => setShowRoundEnd(false)} />
    </div>
  );
}
