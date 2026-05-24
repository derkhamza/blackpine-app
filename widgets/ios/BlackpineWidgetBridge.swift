import Foundation
import WidgetKit

private let APP_GROUP = "group.com.blackpine.cabinet"
private let DATA_KEY  = "widgetData"

@objc(BlackpineWidget)
class BlackpineWidgetBridge: NSObject {

    @objc
    func updateData(_ json: String) {
        guard let ud = UserDefaults(suiteName: APP_GROUP) else { return }
        ud.set(json, forKey: DATA_KEY)
        ud.synchronize()
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
    }

    @objc
    static func requiresMainQueueSetup() -> Bool { false }
}
