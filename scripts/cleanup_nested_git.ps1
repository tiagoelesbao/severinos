$root = "c:\Users\Pichau\Desktop\Sistemas\Virals\severinos"
Get-ChildItem -Path $root -Directory -Hidden -Recurse -Filter ".git" | ForEach-Object {
    if ($_.FullName -ne "$root\.git") {
        Write-Host "Removing nested git repo: $($_.FullName)"
        Remove-Item -Path $_.FullName -Recurse -Force
    }
}
