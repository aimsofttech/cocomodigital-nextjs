import { FiEye, FiHeart, FiPlay, FiThumbsUp, FiClock, FiVideo } from "react-icons/fi";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa6";
import { DashboardShell, LineChart, MiniStat, Panel, WIDTH_STEPS } from "../DashboardKit";

const KPIS = [
  { icon: FiVideo, label: "Videos Edited", value: "1,250" },
  { icon: FiEye, label: "Total Views", value: "20.4M" },
  { icon: FiHeart, label: "Engagement Rate", value: "8.9%" },
  { icon: FiClock, label: "Avg Watch Time", value: "61%" },
];

const TOP_FORMATS = [
  { icon: FaInstagram, label: "Instagram Reels", share: 42 },
  { icon: FaYoutube, label: "YouTube Shorts", share: 28 },
  { icon: FaTiktok, label: "TikTok Clips", share: 20 },
  { icon: FiPlay, label: "Podcast Snippets", share: 10 },
];

/* Three tracks told apart by a near-black density ramp rather than three
   separate hues — the palette here is monochrome plus brand yellow, and a
   yellow bar on the pale track bed would sit at roughly 1.2:1. */
const TIMELINE_TRACKS = [
  { label: "Captions", width: "w-[85%]", tone: "bg-strong" },
  { label: "Music", width: "w-[61%]", tone: "bg-strong/65" },
  { label: "Motion Graphics", width: "w-[42%]", tone: "bg-strong/40" },
];

const PLATFORMS = [FaInstagram, FaYoutube, FaTiktok, FaFacebookF, FaLinkedinIn];

export default function SocialDashboard() {
  return (
    <DashboardShell icon={FiVideo} title="Video Editing Dashboard" control="This Month">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {KPIS.map((kpi) => (
          <MiniStat key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        {/* Vertical-video preview */}
        <div className="sm:col-span-2">
          <div className="relative flex aspect-[9/16] max-h-64 w-full flex-col justify-between overflow-hidden rounded-sticker border-2 border-strong bg-dark-surface p-3">
            <span className="self-start rounded-sm bg-brand px-1.5 py-0.5 text-[8px] font-black text-brand-on">
              Reel · 0:28
            </span>

            <p className="font-satoshi text-sm leading-tight font-black text-brand uppercase">
              Focus on
              <span className="block text-white">the process</span>
            </p>

            <span
              aria-hidden="true"
              className="absolute top-1/3 right-2 flex flex-col gap-2.5 text-white/80"
            >
              <FiHeart className="h-3.5 w-3.5" />
              <FiThumbsUp className="h-3.5 w-3.5" />
              <FiPlay className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>

        <div className="space-y-2.5 sm:col-span-3">
          <Panel title="Views Growth">
            <LineChart
              gradientId="social-views"
              points="10,92 62,78 114,62 166,52 218,32 292,10"
              labels={["May 1", "May 8", "May 15", "May 22", "May 29"]}
            />
          </Panel>

          <Panel title="Top Formats">
            <ul className="space-y-1.5">
              {TOP_FORMATS.map(({ icon: Icon, label, share }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 shrink-0 text-strong" aria-hidden="true" />
                  <span className="w-24 shrink-0 truncate text-[10px] font-medium text-body">
                    {label}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-page-tint">
                    <span className={`block h-full rounded-full bg-strong ${WIDTH_STEPS[share]}`} />
                  </span>
                  <span className="w-8 shrink-0 text-right text-[10px] font-black text-strong">
                    {share}%
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Editing timeline strip */}
      <Panel className="mt-2.5">
        <p className="mb-1.5 flex justify-between text-[9px] font-bold text-subtle">
          <span>00:00</span>
          <span>00:10</span>
          <span>00:20</span>
          <span>00:30</span>
        </p>
        <ul className="space-y-1.5">
          {TIMELINE_TRACKS.map(({ label, width, tone }) => (
            <li key={label} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate text-[9px] font-medium text-muted">
                {label}
              </span>
              <span className="h-2 min-w-0 flex-1 rounded bg-page-tint">
                <span className={`block h-full rounded ${width} ${tone}`} />
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <p className="mt-2.5 flex items-center gap-2 text-[10px] font-medium text-muted">
        Connect Platforms:
        <span aria-hidden="true" className="flex items-center gap-1.5 text-strong">
          {PLATFORMS.map((Icon, index) => (
            <Icon key={index} className="h-3.5 w-3.5" />
          ))}
        </span>
      </p>
    </DashboardShell>
  );
}
