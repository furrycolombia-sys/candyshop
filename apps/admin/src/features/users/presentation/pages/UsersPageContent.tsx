"use client";
/* eslint-disable i18next/no-literal-string -- Supabase table/column identifiers are internal literals */

import { useCurrentUserPermissions } from "auth/client";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import { tid } from "shared";

import { useLogExport } from "@/features/audit/application/hooks/useAuditLog";
import { useUsers } from "@/features/users/application/hooks/useUsers";
import {
  downloadExcel,
  exportUsersToExcel,
  type ReceiptBackup,
} from "@/features/users/application/utils/exportCsv";
import { USER_SEARCH_DEBOUNCE_MS } from "@/features/users/domain/constants";
import { usersSearchParams } from "@/features/users/domain/searchParams";
import { getUserPermissionKeys } from "@/features/users/infrastructure/userPermissionQueries";
import { UserTable } from "@/features/users/presentation/components/UserTable";
import { useSupabase } from "@/shared/application/hooks/useSupabase";
import { useRouter } from "@/shared/infrastructure/i18n";

interface OrderReceiptRow {
  id: string;
  user_id: string;
  receipt_url: string | null;
}

const RECEIPT_ENCODING_ERROR = "Failed to encode receipt";
const DATA_URL_SPLIT_LIMIT = 2;

function toBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.addEventListener("error", () => {
      reject(new Error(RECEIPT_ENCODING_ERROR));
    });
    fileReader.addEventListener("load", () => {
      if (typeof fileReader.result !== "string") {
        reject(new Error(RECEIPT_ENCODING_ERROR));
        return;
      }

      const base64 =
        fileReader.result.split(",", DATA_URL_SPLIT_LIMIT)[1] ?? "";
      resolve(base64);
    });
    fileReader.readAsDataURL(new Blob([buffer]));
  });
}

function filenameFromPath(storagePath: string): string {
  const parts = storagePath.split("/");
  return parts.at(-1) || storagePath;
}

export function UsersPageContent() {
  const t = useTranslations("users");
  const router = useRouter();
  const [params, setParams] = useQueryStates(usersSearchParams);
  const [filterInput, setFilterInput] = useState(params.search);
  const supabase = useSupabase();
  const { grantedKeys } = useCurrentUserPermissions();
  const canExport = grantedKeys.includes("users.export");
  const { mutate: logExport } = useLogExport();

  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Sync external URL changes back to local state (equality guard breaks debounce→URL→sync cycle)
  useEffect(() => {
    const urlValue = params.search ?? "";
    if (urlValue !== filterInput) {
      setFilterInput(urlValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setParams(
        { search: filterInput || null, page: 1 },
        { history: "replace" },
      );
    }, USER_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filterInput, setParams]);

  const { data, isLoading } = useUsers(params.search, params.page);
  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const handleSelectUser = (userId: string) => {
    router.push(`/users/${userId}`);
  };

  const handleExportExcel = async () => {
    const selected = users.filter((u) => selectedUsers.has(u.id));
    if (selected.length === 0) return;
    const selectedIds = selected.map((user) => user.id);

    const permissionsByUserId = Object.fromEntries(
      await Promise.all(
        selected.map(async (user) => [
          user.id,
          await getUserPermissionKeys(supabase, user.id),
        ]),
      ),
    );

    const { data: receiptRowsData } = await supabase
      .from("orders")
      .select("id, user_id, receipt_url")
      .in("user_id", selectedIds)
      .not("receipt_url", "is", null);

    const receiptRows = (receiptRowsData ?? []) as unknown as OrderReceiptRow[];
    const receipts: ReceiptBackup[] = (
      await Promise.all(
        receiptRows
          .filter((row) => !!row.receipt_url)
          .map(async (row) => {
            const storagePath = row.receipt_url as string;
            const { data, error } = await supabase.storage
              .from("receipts")
              .download(storagePath);

            if (error || !data) return null;

            const fileBuffer = await data.arrayBuffer();

            return {
              userId: row.user_id,
              orderId: row.id,
              storagePath,
              fileName: filenameFromPath(storagePath),
              mimeType: data.type || "application/octet-stream",
              byteSize: data.size,
              fileBase64: await toBase64(fileBuffer),
            } satisfies ReceiptBackup;
          }),
      )
    ).filter((receipt): receipt is ReceiptBackup => receipt !== null);

    const timestamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
    const excelContent = exportUsersToExcel(
      selected,
      permissionsByUserId,
      receipts,
    );

    downloadExcel(excelContent, `users-export-${timestamp}.xls`);

    logExport({ table: "users", count: selected.length });
  };

  return (
    <main className="flex flex-1 flex-col bg-dots" {...tid("users-page")}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
        <header>
          <h1
            className="font-display text-4xl font-extrabold uppercase tracking-tight"
            {...tid("users-title")}
          >
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>

        <UserTable
          users={users}
          total={total}
          isLoading={isLoading}
          page={params.page}
          onPageChange={(p) => setParams({ page: p }, { history: "push" })}
          onSelectUser={handleSelectUser}
          selectedUsers={selectedUsers}
          onSelectUsersChange={setSelectedUsers}
          filterInput={filterInput}
          onFilterInputChange={setFilterInput}
          roleFilter={params.roleFilter}
          onRoleFilterChange={(v) =>
            setParams({ roleFilter: v }, { history: "replace" })
          }
          itemFilter={params.itemFilter}
          onItemFilterChange={(v) =>
            setParams({ itemFilter: v }, { history: "replace" })
          }
          canExport={canExport}
          onExportExcel={handleExportExcel}
        />
      </div>
    </main>
  );
}
