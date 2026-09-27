import SwiftUI

struct SignInView: View {
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var code = ""
    @State private var sentTo: String?
    @State private var resendAfter = Date.distantPast
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    Text("RITESTACK").font(.caption.weight(.semibold)).tracking(5).foregroundStyle(Brand.gold)
                    Text("Know what stays.\nDecide what goes.").font(.system(.largeTitle, design: .serif)).foregroundStyle(Brand.cream)
                    Text("A little clarity for the tools you pay for.").font(.title3).foregroundStyle(.secondary)
                    HStack(spacing: 18) {
                        Label("Keep", systemImage: "checkmark"); Label("Cut", systemImage: "scissors"); Label("Pause", systemImage: "pause")
                    }.font(.subheadline).foregroundStyle(Brand.gold)
                    Panel {
                        VStack(alignment: .leading, spacing: 18) {
                            Text(sentTo == nil ? "Your stack, wherever you are" : "Check your email").font(.title2.weight(.semibold))
                            if let address = sentTo {
                                Text("Enter the one-time code sent to \(address). Use the code here instead of opening the web sign-in link.").font(.subheadline).foregroundStyle(.secondary)
                                TextField("Sign-in code", text: $code).keyboardType(.numberPad).textContentType(.oneTimeCode).textFieldStyle(.roundedBorder).accessibilityIdentifier("authCode")
                                Button("Verify and sign in") { Task { _ = await store.verify(email: address, code: code.trimmingCharacters(in: .whitespaces)) } }
                                    .buttonStyle(.borderedProminent).disabled(code.count < 6 || store.busy)
                                TimelineView(.periodic(from: .now, by: 1)) { context in
                                    Button("Send a new code") { Task { if await store.requestCode(email: address) { resendAfter = Date().addingTimeInterval(60) } } }
                                        .disabled(context.date < resendAfter || store.busy)
                                }
                                Button("Use another email") { sentTo = nil; code = "" }.disabled(store.busy)
                            } else {
                                Text("Sign in or create an account with your email. Your personal stack syncs with RiteStack on the web.").font(.subheadline).foregroundStyle(.secondary)
                                TextField("Email address", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress).textInputAutocapitalization(.never).autocorrectionDisabled().textFieldStyle(.roundedBorder).accessibilityIdentifier("email")
                                Button("Email me a code") {
                                    let address = email.trimmingCharacters(in: .whitespacesAndNewlines)
                                    Task { if await store.requestCode(email: address) { sentTo = address; resendAfter = Date().addingTimeInterval(60) } }
                                }.buttonStyle(.borderedProminent).disabled(!email.contains("@") || store.busy)
                            }
                            if store.busy { ProgressView() }
                        }
                    }
                    Button { store.startDemo() } label: { Label("Explore a sample stack", systemImage: "sparkles").frame(maxWidth: .infinity) }.buttonStyle(.bordered).accessibilityIdentifier("demo")
                    Text("No bank connection. No inbox scanning. You add your tools and make the decisions. RiteStack never cancels a subscription for you.").font(.footnote).foregroundStyle(.secondary)
                    HStack {
                        Link("Privacy", destination: URL(string: "https://ritestack.app/privacy")!)
                        Text("·"); Link("Terms", destination: URL(string: "https://ritestack.app/terms")!)
                    }.font(.footnote).frame(maxWidth: .infinity)
                }.padding(24).frame(maxWidth: 600)
            }.frame(maxWidth: .infinity).background(Brand.background)
        }
    }
}
