$ErrorActionPreference = 'Stop'
$p = 'c:\Users\Digital Life\Desktop\bybit\bybit-clone\index.html'
$t = [System.IO.File]::ReadAllText($p)

$map = [ordered]@{
  't-btc.svg'      = 'Bitcoin (BTC) live price'
  't-eth.svg'      = 'Ethereum (ETH) live price'
  't-sol.svg'      = 'Solana (SOL) live price'
  'zec.svg'        = 'Zcash (ZEC) live price'
  't-xrp.svg'      = 'XRP live price'
  't-doge.svg'     = 'Dogecoin (DOGE) live price'
  't-ada.svg'      = 'Cardano (ADA) live price'
  't-mnt.png'      = 'Mantle (MNT) live price'
  'xaut.svg'       = 'Gold (XAUT) token price'
  'tradfi-soxl.svg'= 'SOXL tradFi perpetual market'
  'tradfi-xau.svg' = 'Gold (XAU) tradFi perpetual market'
  'tradfi-cl.svg'  = 'Crude Oil (CL) tradFi perpetual market'
  'earn-usdt2.svg' = 'Tether (USDT) savings and earn'
  'earn-usdc2.png' = 'USD Coin (USDC) savings and earn'
  'earn-btc2.svg'  = 'Bitcoin (BTC) savings and earn'
  'earn-eth2.svg'  = 'Ethereum (ETH) savings and earn'
  'hub-card.png'   = 'Bybit crypto debit card'
  'hub-deposit.png'= 'Deposit cryptocurrency'
  'hub-earn.png'   = 'Earn crypto yield'
  'hub-trade.png'  = 'Trade cryptocurrency and TradFi'
  'ph-bali.png'    = 'Bybit Card travel payment to Bali'
}
$changed = 0
foreach ($k in $map.Keys) {
    $old = 'src="assets/img/' + $k + '" alt=""'
    $new = 'src="assets/img/' + $k + '" alt="' + $map[$k] + '"'
    $cnt = ([regex]::Matches($t, [regex]::Escape($old))).Count
    if ($cnt -gt 0) { $t = $t.Replace($old, $new); $changed += $cnt }
}
[System.IO.File]::WriteAllText($p, $t)

# ---- Validation ----
$remaining = ([regex]::Matches($t, 'alt=""')).Count
$h1ok = $t.Contains('<h1 class="hero-h1 hero-anim ha1">Buy &amp; Sell Bitcoin, Ether and 300+ Cryptocurrencies</h1>')
$faqOk = $t.Contains('<section class="faq">')
$faqSchemaOk = $t.Contains('"@type": "FAQPage"')
$orgCount = ([regex]::Matches($t, 'application/ld\+json')).Count
Write-Output ("alt set on $changed images; remaining empty alt=$remaining")
Write-Output ("H1 keyword-optimized: $h1ok")
Write-Output ("FAQ section present: $faqOk ; FAQPage schema present: $faqSchemaOk ; ld+json blocks=$orgCount")

# Validate BOTH JSON-LD blocks parse
$blocks = [regex]::Matches($t, '(?s)<script type="application/ld\+json">(.*?)</script>')
$i = 1
foreach ($b in $blocks) {
    try { $null = $b.Groups[1].Value | ConvertFrom-Json; Write-Output ("JSON-LD block $i = VALID") }
    catch { Write-Output ("JSON-LD block $i = INVALID: " + $_.Exception.Message) }
    $i++
}
Write-Output 'DONE'
