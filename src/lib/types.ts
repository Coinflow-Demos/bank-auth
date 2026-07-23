export interface BankAccountSummary {
  token: string;
  alias: string;
  last4: string;
}

export interface WithdrawerAccounts {
  hasWithdrawer: boolean;
  kycApproved: boolean;
  bankAccounts: BankAccountSummary[];
}
