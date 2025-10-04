"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload } from "lucide-react";
import { GitHubService } from "@/services";
import { GitHubCardAutoFillProps } from "@/interfaces/ui-components";

export function GitHubCardAutoFill({ onAutoFill }: GitHubCardAutoFillProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleBlur = async () => {
    if (!url.includes("github.com")) return;

    setIsLoading(true);

    try {
      const data = await GitHubService.getMetadata(url);

      onAutoFill({
        title: data.title,
        content: `${data.body ?? ""}\n\n🔗 [View on GitHub](${data.url})`
      });

      toast.success("GitHub issue imported");
    } catch {
      toast.error("Failed to import GitHub issue or PR");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2 mt-2">

      <div className="relative">
        <Input
          id="github-url"
          type="url"
          placeholder="https://github.com/user/repo/issues/123"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onBlur={handleBlur}
          disabled={isLoading}
          className="pl-10 pr-10"
        />

        
        
        <button
          type="button"
          onClick={handleBlur}
          disabled={isLoading || !url.includes("github.com")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Import GitHub issue/PR"
        >
          <Upload className="h-4 w-4" />
        </button>
      </div>

      {isLoading && <Skeleton className="h-20 rounded-md w-full" />}
    </div>
  );
}