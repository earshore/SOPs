# 一次性修复：将 ai_analysis 误用的 Tailwind 语义类替换为引用设计令牌的任意值语法
$ErrorActionPreference = 'Stop'
$root = 'd:\Users\Administrator\Documents\GitHub\sops'
$files = @(
  "$root\src\modules\app_center\views\master_analysis\ai_analysis\template.html",
  "$root\src\modules\app_center\views\master_analysis\ai_analysis\components\AlpinePanel.ts"
)

# 顺序敏感：先处理带 /80 透明度特例（var() 不支持通道拆分），再普通类名
# lookbehind (?<!color-) 排除 --color-text-secondary 等已有变量引用
# lookahead (?![\w-]) 避免匹配 text-secondary-light 等更长类名
$rules = @(
  @{ re = 'hover:bg-secondary/80';           to = 'hover:bg-[color:var(--color-bg-hover)]' },
  @{ re = 'bg-secondary/80';                 to = 'bg-[color:var(--color-bg-secondary)]' },
  @{ re = '(?<!color-)text-primary(?![\w-])';   to = 'text-[color:var(--color-text-primary)]' },
  @{ re = '(?<!color-)text-secondary(?![\w-])'; to = 'text-[color:var(--color-text-secondary)]' },
  @{ re = '(?<!color-)text-tertiary(?![\w-])';  to = 'text-[color:var(--color-text-tertiary)]' },
  @{ re = '(?<!color-)bg-secondary(?![\w-])';   to = 'bg-[color:var(--color-bg-secondary)]' },
  @{ re = '(?<!color-)bg-tertiary(?![\w-])';    to = 'bg-[color:var(--color-bg-tertiary)]' }
)

$total = 0
foreach ($f in $files) {
  $src = [System.IO.File]::ReadAllText($f)
  $out = $src
  $fc = 0
  foreach ($r in $rules) {
    $out = [System.Text.RegularExpressions.Regex]::Replace($out, $r.re, $r.to)
  }
  if ($out -ne $src) {
    [System.IO.File]::WriteAllText($f, $out, (New-Object System.Text.UTF8Encoding $false))
    Write-Output ("FIXED: " + (Split-Path $f -Leaf))
  } else {
    Write-Output ("SKIP:  " + (Split-Path $f -Leaf))
  }
}
