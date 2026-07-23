import SwiftUI

struct ContentView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL = "https://bank-auth.vercel.app"
    @AppStorage("customerId") private var customerId = "bank-auth-demo-\(UUID().uuidString)"

    @State private var sessionKey: String?
    @State private var accounts: WithdrawerAccounts?
    @State private var selectedToken: String?
    @State private var amountText = "1.00"
    @State private var payoutResult: PayoutResult?
    @State private var statusText: String?
    @State private var errorMessage: String?
    @State private var isBusy = false

    private let bankAuthSession = BankAuthSession()
    private let maxDollars = Double(Coinflow.maxPayoutCents) / 100

    var body: some View {
        NavigationStack {
            Form {
                Section("Backend") {
                    TextField("API base URL", text: $apiBaseURL)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Text("customerId: \(customerId)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("1. Bank auth (system browser)") {
                    Button {
                        Task { await startBankAuth() }
                    } label: {
                        Label("Link a bank account", systemImage: "building.columns")
                    }
                    .disabled(isBusy)
                }

                Section("2. Linked accounts (Get Withdrawer)") {
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
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { selectedToken = account.token }
                    }
                    Button("Refresh") {
                        Task { await refreshAccounts() }
                    }
                    .disabled(sessionKey == nil || isBusy)
                }

                Section("3. Delegated payout (max $\(maxDollars, specifier: "%.2f"))") {
                    TextField("Amount", text: $amountText)
                        .keyboardType(.decimalPad)
                        .onChange(of: amountText) { _ in clampAmount() }
                    Button("Send payout") {
                        Task { await sendPayout() }
                    }
                    .disabled(selectedToken == nil || isBusy)

                    if let payoutResult {
                        Text("Signature: \(payoutResult.signature)")
                            .font(.caption)
                        Text("Effective speed: \(payoutResult.effectiveSpeed)")
                            .font(.caption)
                        Button("Check status") {
                            Task { await checkStatus() }
                        }
                        if let statusText {
                            Text("Status: \(statusText)")
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Bank Auth Demo")
            .overlay {
                if isBusy {
                    ProgressView()
                }
            }
        }
    }

    private func clampAmount() {
        guard let value = Double(amountText) else { return }
        if value > maxDollars {
            amountText = String(format: "%.2f", maxDollars)
        }
    }

    private func client() -> APIClient? {
        APIClient(baseURLString: apiBaseURL)
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
            _ = try await bankAuthSession.start(url: authURL)
            await refreshAccounts()
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
