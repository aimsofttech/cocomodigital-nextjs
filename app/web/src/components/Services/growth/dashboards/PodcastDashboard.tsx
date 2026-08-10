import { FiClock, FiDownload, FiMic, FiPlay, FiScissors, FiUsers } from "react-icons/fi";
import {
  DashboardShell,
  LineChart,
  ListRow,
  MiniStat,
  Panel,
  WAVE_PATTERN,
  Waveform,
} from "../DashboardKit";

const KPIS = [
  { icon: FiDownload, label: "Monthly Downloads", value: "125K", delta: "32.5%" },
  { icon: FiClock, label: "Watch Time", value: "9.5K hrs", delta: "29.4%" },
  { icon: FiUsers, label: "Listener Retention", value: "54%", delta: "12.7%" },
  { icon: FiScissors, label: "Short Clips", value: "320", delta: "45.8%" },
];

const TOP_EPISODES = [
  { title: "Building a Brand That Lasts", meta: "May 28, 2024", value: "28.5K" },
  { title: "The Power of Consistency", meta: "May 14, 2024", value: "22.1K" },
  { title: "Scaling Your Online Business", meta: "Apr 30, 2024", value: "18.7K" },
  { title: "Mindset of a Millionaire", meta: "Apr 16, 2024", value: "14.2K" },
];

const TOP_CLIPS = [
  { title: "3 Habits for Success", meta: "Shorts", value: "125K" },
  { title: "Never Give Up", meta: "Reels", value: "98K" },
  { title: "Focus & Discipline", meta: "TikTok", value: "76K" },
];

export default function PodcastDashboard() {
  return (
    <DashboardShell icon={FiMic} title="Podcast Dashboard" control="This Month">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KPIS.map((kpi) => (
          <MiniStat key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <div className="space-y-2.5 lg:col-span-2">
          <Panel title="Episode Waveform">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EE2B2C] text-white">
                <FiPlay className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              </span>
              <Waveform pattern={WAVE_PATTERN} className="min-w-0 flex-1 overflow-hidden" />
            </div>
            <p className="mt-1.5 flex justify-between text-[9px] text-neutral-400">
              <span>00:00</span>
              <span>48:32</span>
            </p>
          </Panel>

          <Panel title="Downloads Over Time">
            <div className="flex gap-2">
              <ul className="flex h-24 flex-col justify-between text-[9px] text-neutral-400 sm:h-28">
                <li>150K</li>
                <li>100K</li>
                <li>50K</li>
              </ul>
              <div className="min-w-0 flex-1">
                <LineChart
                  gradientId="podcast-downloads"
                  points="10,88 68,74 126,66 184,48 242,32 292,12"
                  labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-2.5">
          <Panel title="Top Episodes" action="View all">
            <ul className="divide-y divide-neutral-100">
              {TOP_EPISODES.map((episode, index) => (
                <ListRow key={episode.title} rank={index + 1} {...episode} />
              ))}
            </ul>
          </Panel>

          <Panel title="Top Clip Performance" action="View all">
            <ul className="divide-y divide-neutral-100">
              {TOP_CLIPS.map((clip, index) => (
                <ListRow key={clip.title} rank={index + 1} {...clip} />
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
