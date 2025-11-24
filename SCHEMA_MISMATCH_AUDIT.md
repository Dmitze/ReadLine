# Schema Mismatch & Code Issues Audit
**Date:** 2025-11-24  
**Status:** Found 3 critical issues + 1 potential issue

---

## ✅ FIXED ISSUES

### Issue 1: Promo Codes Table Schema Mismatch (FIXED)
**Severity:** CRITICAL - Database error when adding promo codes

**Problem:**
- Error: `SQLITE_ERROR: table promo_codes has no column named promo_type`
- Code was trying to insert into non-existent columns

**Root Cause:**
- Database schema was outdated/incomplete
- Missing columns: `promo_type`, `description`, `is_active`, `created_by`

**Fix Applied:**
- Updated db.ts to include all required columns in CREATE TABLE
- Created used_promo_codes table for tracking assignments
- Updated migrations.ts with new schema
- Added ALTER TABLE migrations for existing databases

**Files Modified:**
- `src/database/tables/db.ts`
- `src/database/migrations.ts`
- `src/database/migrations/20251124_add_missing_columns_to_promo_codes.sql`

**Commit:** 95bddf3

---

### Issue 2: Promo Code Validation Schema Mismatch (FIXED)
**Severity:** HIGH - Invalid validation rules

**Problem:**
- ValidationSchemas.ts expected fields that don't exist in database
- Expected: `discount_percent`, `max_uses`, `expires_at`
- Actual schema: `code`, `description`, `promo_type`, `is_active`

**Root Cause:**
- Schema refactoring incomplete - validation schema not updated
- Database design simplified to only support yakaboo_unlimited promo type

**Fix Applied:**
- Updated `PromoCodeCreateSchema` in ValidationSchemas.ts
- Changed from discount_percent/max_uses/expires_at to description/promo_type/is_active
- Updated helper function `getDiscountTypeText()` to support yakaboo_unlimited type

**Files Modified:**
- `src/validation/ValidationSchemas.ts`
- `src/database/promoCodeFunctions.ts`

**Commit:** b614faf

---

### Issue 3: Promo Code Statistics Query Mismatch (FIXED)
**Severity:** HIGH - Runtime error in getExtendedPromoStats()

**Problem:**
- Function queries for non-existent columns: `discount_type` and `discount_value`
- Line 395 in promoCodeFunctions.ts:
  ```typescript
  SELECT discount_type as type, COUNT(*) as count, SUM(discount_value) as totalValue
  ```
- These columns don't exist in the current schema

**Root Cause:**
- Function written for old schema design
- Old script (add-promo-codes-tables.js) had discount columns
- Current schema simplified to only promo_type

**Fix Applied:**
- Changed to query `promo_type` instead of `discount_type`
- Changed to COUNT(*) instead of SUM(discount_value)
- Updated `getDiscountTypeText()` to handle yakaboo_unlimited

**Files Modified:**
- `src/database/promoCodeFunctions.ts` (lines 392-405)

**Commit:** b614faf

---

## ⚠️ POTENTIAL ISSUES (Need Clarification)

### Issue 4: Missing Handlers for Preview Tag Callbacks
**Severity:** MEDIUM (may be unused feature)

**Problem:**
- Buttons are created for tag selection: `preview_tag_${tag.id}_${userId}`
- No corresponding `bot.action()` handler found
- Affects: Tag selection in book upload workflow

**Location:**
- Buttons defined: `src/scenes/addBook/utils/preview.ts` lines 71-73
- Missing handlers for: 
  - `preview_tag_*` (tag selection)
  - `preview_skip_tags_*` (skip tags step)
  - `cancel_add_*` (cancel upload)

**Evidence:**
- Grep search found 0 handlers for these patterns in any scene
- Old version (addBookScene.ts.old) had handlers at lines 785-791
- Current version (addBookScene.ts) has no equivalent

**Questions:**
1. Are tags supposed to be optional in book upload?
2. Should these callbacks be handled in the scene?
3. Or should this step be skipped entirely?

**Recommendation:**
- Review if tag selection is still needed in workflow
- If yes: Add handlers to addBookScene.ts
- If no: Remove button definitions from preview.ts

---

## SUMMARY TABLE

| Issue | Type | Severity | Status | File(s) | Commit |
|-------|------|----------|--------|---------|--------|
| Promo table schema incomplete | Database | CRITICAL | ✅ FIXED | db.ts, migrations.ts | 95bddf3 |
| Promo validation schema wrong | Validation | HIGH | ✅ FIXED | ValidationSchemas.ts | b614faf |
| Promo stats queries fail | Query/Runtime | HIGH | ✅ FIXED | promoCodeFunctions.ts | b614faf |
| Preview tag handlers missing | Handler/Logic | MEDIUM | ⚠️ PENDING | addBook/utils/preview.ts | - |

---

## VERIFICATION CHECKLIST

- [x] Build succeeds with no TypeScript errors
- [x] All database migrations are correct
- [x] Validation schemas match database columns
- [x] All database queries reference existing columns
- [x] Promo code statistics can be retrieved
- [ ] Tag selection in book upload works (needs verification)
- [ ] All button callbacks have corresponding handlers (partial)

---

## NEXT STEPS

1. **Verify tag selection workflow** - Test if tag buttons work during book upload
2. **Add missing handlers** if tags are required
3. **Consider removing unused buttons** if tags are optional
4. **Run full integration tests** to ensure no similar issues elsewhere

---

## How These Issues Were Introduced

1. **Promo code schema mismatch**: Likely from incomplete refactoring where database was simplified (removed discount columns) but code wasn't fully updated
2. **Validation mismatch**: Different developer updated database but not validation layer
3. **Query mismatch**: Old query not updated when database schema changed
4. **Missing handlers**: Feature may have been partially refactored or removed from the active scene file

These types of issues are common in refactoring scenarios where:
- Multiple files need coordination (db schema + queries + validation + handlers)
- Old code is replaced but not all references are updated
- Schema changes without updating all dependent code paths
