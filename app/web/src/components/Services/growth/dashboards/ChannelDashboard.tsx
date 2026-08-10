import {
  FiActivity,
  FiClock,
  FiEye,
  FiGrid,
  FiPlay,
  FiSearch,
  FiSettings,
  FiUsers,
} from "react-icons/fi";
import { FaYoutube } from "react-icons/fa6";
import { BarChart, DashboardShell, LineChart, ListRow, MiniStat, Panel } from "../DashboardKit";

const RAIL_ICONS = [FiGrid, FiActivity, FiPlay, FiSearch, FiSettings];

const SECONDARY_KPIS = [
  { icon: FiClock, label: "Watch Time (Hours)", value: "9.5K", delta: "22.4%" },
  { icon: FiActivity, label: "Average View Duration", value: "6:47", delta: "15.2%" },
  { icon: FiEye, label: "Impressions", value: "561K", delta: "27.6%" },
];

const TOP_VIDEOS = [
  {
    title: "How to Grow on YouTube",
    meta: "8:45 · 76.6K impressions",
    value: "28.4K",
    trend: "+32.1%",
  },
  {
    title: "YouTube SEO Full Guide",
    meta: "6:12 · 21.1K impressions",
    value: "21.7K",
    trend: "+23.7%",
  },
  {
    title: "Beat the Algorithm",
    meta: "7:31 · 19.6K impressions",
    value: "18.9K",
    trend: "+21.4%",
  },
];

export default function ChannelDashboard() {
  return (
    <DashboardShell icon={FaYoutube} title="Channel Dashboard" control="Last 28 days">
      <div className="flex gap-2.5">
        {/* Navigation rail */}
        <ul aria-hidden="true" className="hidden shrink-0 flex-col gap-2 sm:flex">
          {RAIL_ICONS.map((Icon, index) => (
            <li
              key={index}
              className={`flex h-7 w-7 items-center justify-center rounded-md ${
                index === 0 ? "bg-[#EE2B2C] text-white" : "bg-neutral-100 text-neutral-400"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
            </li>
          ))}
        </ul>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5">
            <Panel className="sm:col-span-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold text-neutral-700">Total Views</p>
                <p className="text-[10px] font-semibold text-emerald-600">+25.3%</p>
              </div>
              <p className="mt-0.5 text-xl leading-none font-bold text-neutral-900">125K</p>
              <LineChart
                gradientId="channel-views"
                points="10,86 62,72 114,74 166,50 218,36 292,14"
                labels={["W1", "W2", "W3", "W4"]}
              />
            </Panel>

            <Panel className="sm:col-span-2">
              <span className="mb-2 flex h-9 w-full items-center justify-center rounded-md bg-[#EE2B2C] text-white">
                <FiPlay className="h-4 w-4 fill-current" aria-hidden="true" />
              </span>
              <p className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500">
                <FiUsers className="h-3 w-3 text-[#EE2B2C]" aria-hidden="true" />
                Subscribers
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-base leading-none font-bold text-neutral-900">3.62M</span>
                <span className="text-[10px] font-semibold text-emerald-600">+18.1%</span>
              </p>
              <div className="mt-1.5">
                <BarChart heights={[3, 5, 4, 7, 6, 9, 8, 11]} />
              </div>
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SECONDARY_KPIS.map((kpi) => (
              <MiniStat key={kpi.label} {...kpi} />
            ))}
          </div>

          <Panel title="Top Performing Videos" action="View all">
            <ul className="divide-y divide-neutral-100">
              {TOP_VIDEOS.map((video, index) => (
                <ListRow key={video.title} rank={index + 1} {...video} />
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
