import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Help · Tournament Director",
};

const sections = [
  { id: "overview", title: "What this app does" },
  { id: "setup", title: "Setting up a tournament" },
  { id: "clock", title: "Running the clock" },
  { id: "players", title: "Players and buy-ins" },
  { id: "tables", title: "Tables and seating" },
  { id: "payouts", title: "Payouts and chops" },
  { id: "display", title: "Display mode and share link" },
  { id: "undo", title: "Undo and mistakes" },
  { id: "data", title: "Your data, backups, and sign-in" },
  { id: "install", title: "Installing on a phone or tablet" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1">
        {children}
      </CardContent>
    </Card>
  );
}

export default function HelpPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Help</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            How to run a poker tournament with Tournament Director, from setup to the final payout.
          </p>
        </div>

        <nav className="mb-8 rounded-lg border border-border/60 bg-card/50 p-4 text-sm">
          <div className="mb-2 font-medium">On this page</div>
          <ol className="grid gap-1 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid gap-6">
          <Section id="overview" title="What this app does">
            <p>
              Tournament Director runs a home-game or small-club poker tournament from a single
              device. It keeps the blind clock, tracks who is in and who has busted, seats
              players, works out the prize pool and payouts, and can broadcast the clock to a TV
              or to other people&apos;s phones.
            </p>
            <p>
              <strong>It works entirely offline.</strong> Every tournament lives in your browser
              on this device. There is nothing to install and no account is required.
            </p>
            <p>
              <strong>It never moves money.</strong> Buy-ins, rebuys, and payouts are
              bookkeeping only. Collecting cash and paying winners is still up to you.
            </p>
          </Section>

          <Section id="setup" title="Setting up a tournament">
            <ol>
              <li>
                From the home page, tap <strong>New tournament</strong>.
              </li>
              <li>
                Give it a name and set the <strong>buy-in</strong>, <strong>starting stack</strong>,
                and <strong>table size</strong> (seats per table).
              </li>
              <li>
                Pick a <strong>blind structure</strong>. The built-in presets suit most games. To
                build your own, or to generate one that targets a specific length and player
                count, open <Link href="/structures">Blind structures</Link> first.
              </li>
              <li>
                Optionally turn on <strong>rebuys</strong>, an <strong>add-on</strong>, or a{" "}
                <strong>bounty</strong>. Each has its own price and, for rebuys and add-ons, the
                chip stack it buys. Rebuys are only offered until the level you choose under
                &ldquo;Available through&rdquo;.
              </li>
              <li>Tap create. You land on the director screen for that tournament.</li>
            </ol>
            <p>
              The <Link href="/chipsets">Chip sets</Link> page is a separate helper. Describe the
              physical chips you own once, and it tells you how to break down a starting stack for
              any number of players.
            </p>
          </Section>

          <Section id="clock" title="Running the clock">
            <p>
              The director screen has four tabs: <strong>Clock</strong>, <strong>Players</strong>,{" "}
              <strong>Tables</strong>, and <strong>Payouts</strong>. The header always shows how many
              players are left, the current prize pool, and the average stack.
            </p>
            <ul>
              <li>
                Tap <strong>Start clock</strong> when you are ready to deal. Until then the
                tournament is in registration.
              </li>
              <li>
                <strong>Pause</strong> and <strong>Resume</strong> stop and restart the level
                timer. Use <strong>Prev level</strong> and <strong>Next level</strong> to jump
                between levels, and <strong>+1 min</strong> or <strong>−1 min</strong> to nudge
                the time remaining in the current level.
              </li>
              <li>
                Breaks are part of the blind structure and start automatically. The clock shows
                when the next break is due, and during a break it reminds you which chip
                denomination to race off, if the structure calls for it.
              </li>
              <li>
                A sound plays one minute before a level ends, when the blinds go up, and when a
                break starts. Tap Pause or Resume once after opening the page so the browser lets
                it play audio.
              </li>
              <li>
                The screen stays awake while the clock tab is open, so you can leave a tablet
                propped up at the table.
              </li>
            </ul>
            <p>
              The timer is calculated from timestamps rather than a running counter. If you
              reload the page, switch apps, or the device sleeps, the clock picks up exactly where
              it should be.
            </p>
          </Section>

          <Section id="players" title="Players and buy-ins">
            <ul>
              <li>
                Type a name and tap <strong>Buy in</strong> to add a player. The button shows the
                full price, including any bounty.
              </li>
              <li>
                Each player&apos;s row has a menu with <strong>Rebuy</strong>, <strong>Add-on</strong>,
                and <strong>Eliminate</strong>. Rebuys and add-ons only appear when they are
                enabled and still available in the current level.
              </li>
              <li>
                When you eliminate someone, the app records their finishing place. If bounties are
                on, it also asks who knocked them out so the bounty goes to the right player.
              </li>
              <li>
                When one player is left and the clock has been started, a banner offers{" "}
                <strong>Finish tournament</strong>. Finishing locks the result and marks it done on
                the home page.
              </li>
            </ul>
          </Section>

          <Section id="tables" title="Tables and seating">
            <ul>
              <li>
                <strong>Draw seats</strong> assigns every active player a random table and seat,
                using the table size you chose at setup. Once seats exist the button becomes{" "}
                <strong>Redraw all seats</strong>.
              </li>
              <li>
                <strong>Balance tables</strong> appears when tables are uneven. It proposes moves
                so no table has more than one player more than another. You see the list of moves
                before confirming, so you can read them out at the table.
              </li>
              <li>
                <strong>Break table</strong> empties the highest-numbered table and spreads its
                players across open seats elsewhere, again with a confirmation list.
              </li>
              <li>Tap any seated player to move them to a specific table and seat by hand.</li>
            </ul>
          </Section>

          <Section id="payouts" title="Payouts and chops">
            <p>
              The prize pool is the sum of all buy-ins, rebuys, and add-ons. Bounties are
              collected on top of that and shown separately; each one goes to whoever made the
              knockout. The Payouts tab splits the pool across paid places using a standard payout
              table that scales with the number of entries.
            </p>
            <ul>
              <li>
                <strong>Edit payouts</strong> lets you type your own amount for each place and
                add or remove places. The amounts must add up to the pool before you can save.{" "}
                <strong>Reset to standard</strong> goes back to the automatic table.
              </li>
              <li>
                When the remaining players want to deal, open the <strong>Chop calculator</strong>,
                enter each player&apos;s chip count, and pick a method. Recording the deal replaces
                the payouts for the places still in play, and you can clear it later if the deal
                falls through.
              </li>
            </ul>
            <p>The three chop methods:</p>
            <ul>
              <li>
                <strong>ICM</strong> (by stack equity): the standard tournament chop. Each player
                gets their mathematical share of the remaining prizes based on stack sizes.
              </li>
              <li>
                <strong>Chip chop</strong>: everyone locks up the lowest remaining prize, and the
                rest is split in proportion to chips.
              </li>
              <li>
                <strong>Even</strong>: the remaining pool split equally.
              </li>
            </ul>
            <p>Figures are rounded so the chop adds up exactly to the remaining pool.</p>
          </Section>

          <Section id="display" title="Display mode and share link">
            <p>There are two ways to show the clock to the room.</p>
            <ul>
              <li>
                <strong>Open display</strong> in the director header opens a full-screen board in
                a new tab. Cast or plug that tab into a TV and double-click it to go fullscreen. It
                updates instantly because it runs on the same device.
              </li>
              <li>
                <strong>Share link</strong> shows a QR code and a short link that anyone can open
                on their own phone to follow the clock, blinds, and player count. It is read-only.
                Your device pushes updates to the link whenever something changes, and viewers see
                a warning if updates stop arriving. This needs an internet connection on both
                ends.
              </li>
            </ul>
          </Section>

          <Section id="undo" title="Undo and mistakes">
            <p>
              Every action you take, such as a buy-in, an elimination, or a level change, is
              recorded as an entry in the tournament&apos;s history. The <strong>Undo</strong>{" "}
              button in the director header removes the most recent one. The button label tells you
              what it will undo. Tap it repeatedly to step back further.
            </p>
            <p>
              Because the app replays the history to work out the current state, undoing an
              elimination also restores the player&apos;s seat, their place, and any bounty that
              was awarded.
            </p>
          </Section>

          <Section id="data" title="Your data, backups, and sign-in">
            <p>
              Tournaments, blind structures, and chip sets are stored in your browser on this
              device only. Clearing site data, or switching browsers, will lose them unless you
              have a backup.
            </p>
            <ul>
              <li>
                <strong>Export backup</strong> on the home page downloads a single file containing
                everything. Keep it somewhere safe.
              </li>
              <li>
                <strong>Import backup</strong> merges a backup file into this device. Existing
                records with the same ID are overwritten by the file; nothing else is deleted.
              </li>
            </ul>
            <p>
              Signing in on the <Link href="/account">Account</Link> page is optional. There is no
              password: enter your email and we send a 6-digit code that expires in ten minutes.
              Signing in does not currently sync tournaments between devices, so backups are still
              the way to move data around.
            </p>
          </Section>

          <Section id="install" title="Installing on a phone or tablet">
            <p>
              Tournament Director is a web app you can add to your home screen so it opens
              full-screen and works without a connection.
            </p>
            <ul>
              <li>
                <strong>iPhone and iPad:</strong> open the site in Safari, tap the Share button,
                then <strong>Add to Home Screen</strong>.
              </li>
              <li>
                <strong>Android:</strong> open the site in Chrome, tap the three-dot menu, then{" "}
                <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
              <li>
                <strong>Desktop:</strong> in Chrome or Edge, use the install icon at the right end
                of the address bar.
              </li>
            </ul>
            <p>
              Load the site once while online so it can cache itself. After that the clock,
              players, tables, and payouts all work with no signal at all. Only the share link
              needs the internet.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
