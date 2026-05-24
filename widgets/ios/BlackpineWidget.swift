import WidgetKit
import SwiftUI

// ─── Data model shared between app and widget ────────────────────────────────

private let APP_GROUP = "group.com.blackpine.cabinet"
private let DATA_KEY   = "widgetData"

struct WidgetData: Codable {
    var todayCount: Int = 0
    var nextApptTime: String? = nil
    var updatedAt: String = ""
}

// ─── Timeline provider ───────────────────────────────────────────────────────

struct BlackpineProvider: TimelineProvider {

    func placeholder(in context: Context) -> BlackpineEntry {
        BlackpineEntry(date: .now, data: WidgetData(todayCount: 3, nextApptTime: "14:30"))
    }

    func getSnapshot(in context: Context, completion: @escaping (BlackpineEntry) -> Void) {
        completion(BlackpineEntry(date: .now, data: load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BlackpineEntry>) -> Void) {
        let entry = BlackpineEntry(date: .now, data: load())
        // Reload every 30 min; the app also calls WidgetCenter.reloadAll on change
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: .now)!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }

    private func load() -> WidgetData {
        guard
            let ud      = UserDefaults(suiteName: APP_GROUP),
            let json    = ud.string(forKey: DATA_KEY),
            let encoded = json.data(using: .utf8),
            let data    = try? JSONDecoder().decode(WidgetData.self, from: encoded)
        else { return WidgetData() }
        return data
    }
}

struct BlackpineEntry: TimelineEntry {
    let date: Date
    let data: WidgetData
}

// ─── Widget view ─────────────────────────────────────────────────────────────

struct BlackpineWidgetView: View {
    var entry: BlackpineEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {

            // Brand row
            Text("BLACKPINE")
                .font(.system(size: 9, weight: .black))
                .tracking(1.8)
                .foregroundColor(.white.opacity(0.55))

            Spacer()

            // Big count
            HStack(alignment: .lastTextBaseline, spacing: 3) {
                Text("\(entry.data.todayCount)")
                    .font(.system(size: family == .systemSmall ? 48 : 56, weight: .black))
                    .foregroundColor(.white)
                Text(entry.data.todayCount == 1 ? "RDV" : "RDVs")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white.opacity(0.75))
                    .offset(y: -6)
            }

            // Next appointment
            HStack(spacing: 4) {
                Image(systemName: "clock.fill")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.65))
                Text(entry.data.nextApptTime ?? "Aucun RDV")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(.white.opacity(0.85))
            }
            .padding(.top, 2)
        }
        .padding(14)
        .containerBackground(
            LinearGradient(
                colors: [
                    Color(red: 0.04, green: 0.31, blue: 0.49),
                    Color(red: 0.06, green: 0.42, blue: 0.67),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            for: .widget
        )
    }
}

// ─── Widget configuration ─────────────────────────────────────────────────────

struct BlackpineWidget: Widget {
    let kind = "BlackpineWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BlackpineProvider()) { entry in
            BlackpineWidgetView(entry: entry)
        }
        .configurationDisplayName("Blackpine Cabinet")
        .description("Rendez-vous du jour.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
