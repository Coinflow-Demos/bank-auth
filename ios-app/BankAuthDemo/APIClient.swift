import Foundation

struct BankAccountSummary: Codable, Identifiable {
    var id: String { token }
    let token: String
    let alias: String
    let last4: String
}

struct WithdrawerAccounts: Codable {
    let hasWithdrawer: Bool
    let kycApproved: Bool
    let bankAccounts: [BankAccountSummary]
}

struct PayoutResult: Codable {
    let signature: String
    let effectiveSpeed: String
}

struct APIErrorBody: Codable {
    let error: String
}

enum APIClientError: Error, LocalizedError {
    case server(String)
    case invalidURL

    var errorDescription: String? {
        switch self {
        case .server(let message): return message
        case .invalidURL: return "Invalid API base URL"
        }
    }
}

/// Talks to this repo's own Next.js API routes (never to Coinflow directly —
/// the merchant API key stays server-side there).
struct APIClient {
    let baseURL: URL

    init?(baseURLString: String) {
        guard let url = URL(string: baseURLString) else { return nil }
        self.baseURL = url
    }

    private func post<Body: Encodable, Response: Decodable>(
        path: String,
        body: Body
    ) async throws -> Response {
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(body)

        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkResponse(response, data: data)
        return try JSONDecoder().decode(Response.self, from: data)
    }

    private static func checkResponse(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { return }
        guard (200...299).contains(http.statusCode) else {
            if let body = try? JSONDecoder().decode(APIErrorBody.self, from: data) {
                throw APIClientError.server(body.error)
            }
            throw APIClientError.server("Request failed with status \(http.statusCode)")
        }
    }

    func fetchSessionKey(customerId: String) async throws -> String {
        struct RequestBody: Encodable { let customerId: String }
        struct ResponseBody: Decodable { let sessionKey: String }
        let response: ResponseBody = try await post(
            path: "/api/session-key",
            body: RequestBody(customerId: customerId)
        )
        return response.sessionKey
    }

    func fetchWithdrawer(sessionKey: String) async throws -> WithdrawerAccounts {
        struct RequestBody: Encodable { let sessionKey: String }
        return try await post(path: "/api/withdrawer", body: RequestBody(sessionKey: sessionKey))
    }

    func createPayout(
        customerId: String,
        accountToken: String,
        amountCents: Int
    ) async throws -> PayoutResult {
        struct RequestBody: Encodable {
            let customerId: String
            let accountToken: String
            let amountCents: Int
        }
        return try await post(
            path: "/api/payout",
            body: RequestBody(
                customerId: customerId,
                accountToken: accountToken,
                amountCents: amountCents
            )
        )
    }

    func fetchWithdrawalStatus(withdrawalId: String) async throws -> String {
        struct ResponseBody: Decodable { let withdrawal: [String: AnyDecodable] }
        var request = URLRequest(
            url: baseURL.appendingPathComponent(
                "/api/withdrawal/\(withdrawalId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? withdrawalId)"
            )
        )
        request.httpMethod = "GET"
        let (data, response) = try await URLSession.shared.data(for: request)
        try Self.checkResponse(response, data: data)
        let decoded = try JSONDecoder().decode(ResponseBody.self, from: data)
        if case .string(let status)? = decoded.withdrawal["status"]?.value {
            return status
        }
        return "unknown"
    }
}

/// Minimal helper so we can pull a single "status" string out of a withdrawal
/// object without modeling every field Coinflow returns.
struct AnyDecodable: Decodable {
    enum Value {
        case string(String)
        case number(Double)
        case bool(Bool)
        case null
        case other
    }
    let value: Value

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let stringValue = try? container.decode(String.self) {
            value = .string(stringValue)
        } else if let numberValue = try? container.decode(Double.self) {
            value = .number(numberValue)
        } else if let boolValue = try? container.decode(Bool.self) {
            value = .bool(boolValue)
        } else if container.decodeNil() {
            value = .null
        } else {
            value = .other
        }
    }
}
