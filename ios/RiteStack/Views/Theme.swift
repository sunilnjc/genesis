import SwiftUI

enum Brand {
    static let background = Color(red: 0.055, green: 0.063, blue: 0.063)
    static let card = Color(red: 0.10, green: 0.11, blue: 0.11)
    static let gold = Color(red: 0.84, green: 0.73, blue: 0.54)
    static let cream = Color(red: 0.95, green: 0.93, blue: 0.88)
}
struct Panel<Content: View>: View {
    @ViewBuilder var content: Content
    var body: some View { content.padding(20).frame(maxWidth: .infinity, alignment: .leading).background(Brand.card, in: RoundedRectangle(cornerRadius: 22)) }
}
struct RootView: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        @Bindable var store = store
        Group {
            if store.loading && !store.signedIn { ProgressView("Opening your stack…").frame(maxWidth: .infinity, maxHeight: .infinity).background(Brand.background) }
            else if store.signedIn { StackTabs() }
            else { SignInView() }
        }
        .alert("Couldn’t complete that", isPresented: Binding(get: { store.error != nil }, set: { if !$0 { store.error = nil } })) {
            Button("OK") { store.error = nil }
        } message: { Text(store.error ?? "Please try again.") }
    }
}
