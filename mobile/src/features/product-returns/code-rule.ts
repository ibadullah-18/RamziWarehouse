import { useEffect, useState } from 'react';

import { getReturnCodeRule } from '../../api/product-return-api';

/** Admin setting for every return: digits in a code and whether its second digit must be 0. */
export type ReturnCodeRule = {
  requiredLength: number | null;
  secondDigitMustBeZero: boolean;
};

export const noCodeRule: ReturnCodeRule = { requiredLength: null, secondDigitMustBeZero: false };

/** Same check as the server; null when the code is fine. */
export function codeRuleProblem(code: string, rule: ReturnCodeRule): string | null {
  const value = code.trim();
  if (!value) return null;
  if (rule.requiredLength !== null && value.length !== rule.requiredLength)
    return `Kod ${rule.requiredLength} rəqəmli olmalıdır (indi ${value.length}).`;
  if (rule.secondDigitMustBeZero && (value.length < 2 || value[1] !== '0'))
    return 'Kodun ikinci rəqəmi 0 olmalıdır (məsələn 1019, 5012).';
  return null;
}

/** Loads the rule once; without a connection no rule is enforced here and the server still checks. */
export function useReturnCodeRule(token: string | undefined): ReturnCodeRule {
  const [rule, setRule] = useState<ReturnCodeRule>(noCodeRule);
  useEffect(() => {
    if (!token) return;
    let active = true;
    getReturnCodeRule(token)
      .then((result) => active && setRule(result))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [token]);
  return rule;
}
