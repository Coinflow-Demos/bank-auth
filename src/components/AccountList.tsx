import type {BankAccountSummary} from '@/lib/types';

export function AccountList({
  accounts,
  selectedToken,
  onSelect,
}: {
  accounts: BankAccountSummary[];
  selectedToken: string | null;
  onSelect: (token: string) => void;
}) {
  if (accounts.length === 0) {
    return <p className="muted">No bank accounts linked yet.</p>;
  }

  return (
    <ul className="account-list">
      {accounts.map(account => (
        <li key={account.token}>
          <label className="account-row">
            <input
              type="radio"
              name="account"
              checked={selectedToken === account.token}
              onChange={() => onSelect(account.token)}
            />
            <span>
              {account.alias || 'Bank account'} •••• {account.last4}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}
