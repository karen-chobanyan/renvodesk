import { useState } from "react";
import {
  ScheduleControls,
  ScheduleHeader,
  type ScheduleMode,
} from "@/features/tasks/schedule-layout";
import { weekStart } from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { DemoTaskPanel } from "./demo-tasks";

export function DemoSchedulePage() {
  const { base } = useDemo();
  const [mode, setMode] = useState<ScheduleMode>("week"),
    [start, setStart] = useState(() => weekStart(base)),
    [mine, setMine] = useState(false);
  return (
    <div className="schedule-workspace">
      <ScheduleHeader />
      <ScheduleControls
        mode={mode}
        onMode={setMode}
        mine={mine}
        onMine={setMine}
        start={start}
        onStart={setStart}
        day={base}
      />
      <DemoTaskPanel
        filter={{ mode, start, mine }}
        onClearMine={() => setMine(false)}
      />
    </div>
  );
}
