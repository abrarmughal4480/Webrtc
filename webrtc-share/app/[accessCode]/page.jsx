"use client";
import { useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";

export default function ShortenedUploadPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessCode = params?.accessCode;

  useEffect(() => {
    if (accessCode) {
      // Build the redirect URL to main page with parameters
      const redirectUrl = new URL(`/`, window.location.origin);
      
      // Add the access code as a parameter
      redirectUrl.searchParams.append('access_code', accessCode);
      
      // Add any existing search parameters
      searchParams.forEach((value, key) => {
        redirectUrl.searchParams.append(key, value);
      });
      
      // Redirect to the main page
      router.replace(redirectUrl.toString());
    }
  }, [accessCode, searchParams, router]);

  // Return null to avoid showing any loading screen
  return null;
} 