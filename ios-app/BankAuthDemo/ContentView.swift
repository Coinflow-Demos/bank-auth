import SwiftUI
import UIKit

struct ContentView: View {
    @State private var customerId = Coinflow.generateCustomerId()

    @State private var sessionKey: String?
    @State private var accounts: WithdrawerAccounts?
    @State private var selectedToken: String?
    @State private var amountText = "1.00"
    @State private var payoutResult: PayoutResult?
    @State private var statusText: String?
    @State private var errorMessage: String?
    @State private var isBusy = false
    @State private var awaitingBankAuthReturn = false

    private let maxDollars = Double(Coinflow.maxPayoutCents) / 100

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    banner(
                        "Sandbox only — merchant \(Coinflow.merchantId). Capped at $\(String(format: "%.2f", maxDollars)).",
                        tint: .green
                    )

                    card("1. Link a bank account") {
                        Text("customerId: \(customerId)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .truncationMode(.middle)

                        Button {
                            Task { await startBankAuth() }
                        } label: {
                            Label("Link a bank account", systemImage: "building.columns")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isBusy)
                    }

                    card("2. Linked accounts (Get Withdrawer)") {
                        if let accounts, accounts.bankAccounts.isEmpty {
                            Text("No bank accounts linked yet.")
                                .foregroundStyle(.secondary)
                        }
                        ForEach(accounts?.bankAccounts ?? []) { account in
                            HStack {
                                Text("\(account.alias) •••• \(account.last4)")
                                Spacer()
                                if selectedToken == account.token {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.blue)
                                }
                            }
                            .padding(.vertical, 4)
                            .contentShape(Rectangle())
                            .onTapGesture { selectedToken = account.token }
                        }
                        Button("Refresh") {
                            Task { await refreshAccounts() }
                        }
                        .disabled(sessionKey == nil || isBusy)
                    }

                    card("3. Delegated payout (max $\(String(format: "%.2f", maxDollars)))") {
                        TextField("Amount", text: $amountText)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .onChange(of: amountText) { _ in clampAmount() }

                        Button("Send payout") {
                            Task { await sendPayout() }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(selectedToken == nil || isBusy)

                        if let payoutResult {
                            Divider()
                            Text("Signature: \(payoutResult.signature)")
                                .font(.caption)
                                .lineLimit(1)
                                .truncationMode(.middle)
                            Text("Effective speed: \(payoutResult.effectiveSpeed)")
                                .font(.caption)
                            Button("Check status") {
                                Task { await checkStatus() }
                            }
                            if let statusText {
                                Text("Status: \(statusText)")
                                    .font(.caption)
                            }
                        }
                    }

                    if let errorMessage {
                        banner(errorMessage, tint: .red)
                    }
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Bank Auth Demo")
            .overlay {
                if isBusy {
                    ProgressView()
                        .padding(24)
                        .background(.thinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                }
            }
            // Fires when iOS reopens the app via bankauthdemo://callback,
            // i.e. Safari handing control back after bank auth finishes.
            .onOpenURL { url in
                guard url.scheme == Coinflow.callbackURLScheme,
                      awaitingBankAuthReturn else { return }
                awaitingBankAuthReturn = false
                Task { await refreshAccounts() }
            }
        }
    }

    @ViewBuilder
    private func card<Content: View>(
        _ title: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title).font(.headline)
            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemGroupedBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }

    private func banner(_ text: String, tint: Color) -> some View {
        Text(text)
            .font(.footnote)
            .foregroundStyle(.primary)
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(tint.opacity(0.12))
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func clampAmount() {
        guard let value = Double(amountText) else { return }
        if value > maxDollars {
            amountText = String(format: "%.2f", maxDollars)
        }
    }

    private func client() -> APIClient? {
        APIClient(baseURLString: Coinflow.apiBaseURL)
    }

    private func startBankAuth() async {
        guard let client = client() else {
            errorMessage = "Invalid API base URL"
            return
        }
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }

        do {
            let key = try await client.fetchSessionKey(customerId: customerId)
            sessionKey = key
            let authURL = Coinflow.bankAuthURL(sessionKey: key)
            // Coinflow's own guidance for mobile apps (see the React Native
            // redirect example in their docs): hand off to the real system
            // browser rather than an in-app session — OAuth banks need the
            // genuine, fully-external Safari context. iOS backgrounds this
            // app; `.onOpenURL` picks things back up when Safari redirects
            // to bankauthdemo://callback after linking finishes.
            awaitingBankAuthReturn = true
            let opened = await UIApplication.shared.open(authURL)
            if !opened {
                awaitingBankAuthReturn = false
                errorMessage = "Could not open Safari"
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func refreshAccounts() async {
        guard let client = client(), let sessionKey else { return }
        isBusy = true
        errorMessage = nil
        defer { isBusy = false }
        do {
            accounts = try await client.fetchWithdrawer(sessionKey: sessionKey)
            // Skip the extra tap when there's exactly one account to pick from.
            if selectedToken == nil, let only = accounts?.bankAccounts, only.count == 1 {
                selectedToken = only[0].token
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func sendPayout() async {
        guard let client = client(), let selectedToken else { return }
        clampAmount()
        guard let dollars = Double(amountText) else { return }
        let cents = Int((dollars * 100).rounded())

        isBusy = true
        errorMessage = nil
        payoutResult = nil
        statusText = nil
        defer { isBusy = false }

        do {
            payoutResult = try await client.createPayout(
                customerId: customerId,
                accountToken: selectedToken,
                amountCents: cents
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func checkStatus() async {
        guard let client = client(), let payoutResult else { return }
        statusText = "Checking…"
        do {
            statusText = try await client.fetchWithdrawalStatus(withdrawalId: payoutResult.signature)
        } catch {
            statusText = "Error: \(error.localizedDescription)"
        }
    }
}

#Preview {
    ContentView()
}
