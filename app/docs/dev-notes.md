# Development Notes

## Next.js generated type/cache errors

Sometimes `npm run build` can fail inside generated `.next` files, for example:

```text
.next/dev/types/routes.d.ts
Type error: ';' expected


Do not edit files inside .next.

Fix from Git Bash:

taskkill //F //IM node.exe
rm -rf .next
npm run build

Alternative Git Bash command using Windows cmd:

cmd //c rmdir /s /q .next
npm run build

If the build then succeeds, the issue was a stale or corrupted Next.js generated cache.


## Test

```bash
npm run build

If good:

git add .
git commit -m "Document Next.js cache reset fix"

/*==================================================*/

