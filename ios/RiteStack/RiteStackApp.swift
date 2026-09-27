import SwiftUI

@main struct RiteStackApp: App {
    @State private var store = AppStore()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            RootView().environment(store)
                .tint(Brand.gold)
                .preferredColorScheme(.dark)
                .task { await store.start() }
                .onChange(of: phase) { _, value in if value == .active { Task { await store.refresh() } } }
        }
    }
}
