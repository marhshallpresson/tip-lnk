export const NIGERIAN_BANKS = [
  { id: '044', code: '044', name: 'Access Bank' },
  { id: '063', code: '063', name: 'Access Bank Diamond' },
  { id: '023', code: '023', name: 'Citibank Nigeria' },
  { id: '050', code: '050', name: 'Ecobank Nigeria' },
  { id: '070', code: '070', name: 'Fidelity Bank' },
  { id: '011', code: '011', name: 'First Bank of Nigeria' },
  { id: '214', code: '214', name: 'First City Monument Bank' },
  { id: '058', code: '058', name: 'Guaranty Trust Bank' },
  { id: '030', code: '030', name: 'Heritage Bank' },
  { id: '301', code: '301', name: 'Jaiz Bank' },
  { id: '082', code: '082', name: 'Keystone Bank' },
  { id: '076', code: '076', name: 'Polaris Bank' },
  { id: '101', code: '101', name: 'Providus Bank' },
  { id: '221', code: '221', name: 'Stanbic IBTC Bank' },
  { id: '068', code: '068', name: 'Standard Chartered Bank' },
  { id: '232', code: '232', name: 'Sterling Bank' },
  { id: '100', code: '100', name: 'SunTrust Bank' },
  { id: '032', code: '032', name: 'Union Bank of Nigeria' },
  { id: '033', code: '033', name: 'United Bank for Africa' },
  { id: '215', code: '215', name: 'Unity Bank' },
  { id: '035', code: '035', name: 'Wema Bank' },
  { id: '057', code: '057', name: 'Zenith Bank' },
  { id: '999992', code: '999992', name: 'OPay' },
  { id: '100033', code: '100033', name: 'PalmPay' },
]

export const findNigerianBank = (bankCode: string) =>
  NIGERIAN_BANKS.find((bank) => bank.code === bankCode || bank.id === bankCode)
