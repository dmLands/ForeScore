import UIKit
import Capacitor

class ForeScoreViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        bridge?.registerPluginType(ForeScoreIAPPlugin.self)
    }
}
