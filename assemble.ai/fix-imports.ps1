$srcPath = "d:\assemble.ai P2\assemble.ai\src"
Get-ChildItem -Recurse -Include *.ts,*.tsx -Path $srcPath | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "from '@/lib/db/schema'") {
        $newContent = $content -replace "from '@/lib/db/schema'", "from '@/lib/db'"
        Set-Content $_.FullName -Value $newContent -NoNewline
        Write-Host "Updated: $($_.FullName)"
    }
}
Write-Host "Done!"
