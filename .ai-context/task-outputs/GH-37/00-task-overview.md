# Task Overview: GH-37

## Issue Details

| Field         | Value                                  |
| ------------- | -------------------------------------- |
| **Issue**     | #37                                    |
| **Title**     | Excel Export for Users in Admin Module |
| **Type**      | feat                                   |
| **Labels**    | feature                                |
| **Assignee**  | Unassigned                             |
| **Milestone** | None                                   |
| **Created**   | 2026-04-10                             |

## Description

Create an admin module to select users, filter them so we can select them. We want filters by buyer, seller, items, and then export it to excel.

## Acceptance Criteria

- Admin module with a user list table/grid
- Filter by user type (buyer, seller)
- Filter by items (probably items purchased/sold?)
- Ability to select specific users from the filtered list
- Export the selected users to an Excel file

## Visual Context

No images provided.

## Dependencies

- [ ] Excel generation library (check if `xlsx` or `exceljs` is installed)

## Missing Information

- [ ] Exact fields to export in the Excel file
- [ ] Meaning of "items" filter (items they bought/sold? items currently listed?)
