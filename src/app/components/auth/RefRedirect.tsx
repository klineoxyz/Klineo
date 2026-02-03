import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ROUTES, REF_CODE_STORAGE_KEY } from "@/app/config/routes";

/**
 * /ref/:code — Store referral code in localStorage and redirect to signup.
 * After auth, the App will call POST /api/referrals/claim and clear the stored code.
 */
export function RefRedirect() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const trimmed = (code || "").trim().toUpperCase();
    if (trimmed) {
      try {
        localStorage.setItem(REF_CODE_STORAGE_KEY, trimmed);
      } catch {
        /* ignore */
      }
    }
    navigate(ROUTES.signup, { replace: true });
  }, [code, navigate]);

  return null;
}
