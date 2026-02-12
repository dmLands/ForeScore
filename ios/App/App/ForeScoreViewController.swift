import UIKit
import WebKit
import Capacitor

class ForeScoreViewController: CAPBridgeViewController {

    override open func webViewConfiguration(for instanceConfiguration: InstanceConfiguration) -> WKWebViewConfiguration {
        let config = super.webViewConfiguration(for: instanceConfiguration)

        let script = WKUserScript(
            source: "window.__FORESCORE_NATIVE_IOS__ = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(script)

        return config
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginType(ForeScoreIAPPlugin.self)
    }
}
