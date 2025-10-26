# 🚀 90-Saniye Green Room Script

**Son launch execution - Kopyala & Çalıştır**

---

## T-15: Roll Call & Roller

```
✅ Captain: [İSİM] - GO/NO-GO kararları
✅ Driver: [İSİM] - Komutları çalıştır
✅ Scribe: [İSİM] - Timeline dokümante et
✅ Metrics: [İSİM] - Dashboard'ları izle
✅ Infra: [İSİM] - K8s/infrastructure
✅ App: [İSİM] - Uygulama sağlığı
✅ Security: [İSİM] - Güvenlik validasyonu

🔗 Zoom/Teams bridge: [LINK]
📢 Incident channel: #launch-vorte-api
```

---

## T-12: Değişiklik Kanıtları

### Audit (Staging→Prod Aynı Versiyon)

```bash
export BASE_URL="https://staging-api.yourcompany.com"
./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT: $?"
```

**Beklenen**: `EXIT: 0`

---

## T-10: Immutable Image (TAG → DIGEST)

```bash
# Tag'i digest'e pin'le - tekrar üretilebilirlik & hızlı rollback için
export IMAGE="registry.yourco/vorte-api:2025-01-26.1"
export DIGEST="$(crane digest $IMAGE)"  # veya: regctl image digest $IMAGE
echo "$IMAGE@$DIGEST"
export NS="production"
```

**KRİTİK**: Deployment için tag değil, digest kullan!

---

## T-8: Final Production Audit

```bash
export BASE_URL="https://api.yourcompany.com"
./scripts/pre-launch-audit.sh "$BASE_URL"
echo "EXIT: $?"
```

**Beklenen**: `EXIT: 0`

---

## T-5 → T+15: Canary → Full

### Deploy

```bash
kubectl -n $NS set image deploy/vorte-api api="$IMAGE@$DIGEST"
kubectl -n $NS rollout status deploy/vorte-api -w
```

### Canary Progression

```
T+5:  10% traffic → 5 dk izle
T+10: 50% traffic → 5 dk izle  
T+15: 100% traffic → Sürekli izle
```

**Karar**: Paneller yeşil → Devam | Herhangi biri kırmızı → ROLLBACK

---

## 🛑 Stop-the-Line Kriterleri (Anında ROLLBACK)

```
❌ P95 > 5s
❌ Error > 5%
❌ Payment Success < 90%
❌ Alerts > 0
❌ Webhook error artışı
```

**Herhangi bir tetikleyici → Hemen rollback çalıştır**

---

## 🔄 Rollback (≤5 dk)

```bash
kubectl -n $NS rollout undo deploy/vorte-api
kubectl -n $NS rollout status deploy/vorte-api -w

# Eski versiyonun sağlıklı olduğunu doğrula
./scripts/pre-launch-audit.sh "$BASE_URL"
```

---

## 📊 Mikro İzleme (T+30/60/120)

```
✅ P95 < 2s
✅ Error < 1%
✅ Payment > 95%
✅ Notification backlog < 100
✅ Alerts = 0
✅ Webhook/callback errors = 0
```

---

## 📢 GO/HOLD Anons Şablonları

### GO

```
🟢 GO: Tüm paneller yeşil
• Audit: 0
• P95: <2s
• Error: <1%
• Payment: >95%
• Backlog: <100
• Alerts: 0

Canary başlıyor...
```

### HOLD

```
🔴 HOLD: KIRMIZI bayrak tespit edildi
• Sorun: [P95/Error/Payment/Alerts]
• Rollback başlatıldı
• Postmortem: #INC-xxxx
```

---

## 💡 Tek Satır Hatırlatmalar

```
✅ Readiness/Liveness fail → Panik yok; rollout status izle
✅ Tag değil digest kullan: api="image@sha256:..."
✅ Correlation hazır: X-Request-Id + traceparent log'larda
✅ Post-rollback: Audit'i yeniden çalıştır (eski versiyon yeşil olmalı)
```

---

## 🎯 Execution Checklist

```
[ ] Takım rolleri atandı
[ ] İletişim kanalları açık
[ ] Staging audit: EXIT 0
[ ] Image digest pin'lendi
[ ] Production audit: EXIT 0
[ ] Dashboard'lar açık
[ ] Rollback komutları hazır
```

---

## 📱 Acil Durum İletişim

- **On-Call**: [PagerDuty/Slack]
- **Escalation**: [Engineering Lead]
- **Provider Destek**:
  - iyzico: +90 850 222 0 600
  - PayTR: +90 444 25 52

---

## ⏱️ Timeline Özeti

```
T-15: Roll call
T-12: Staging audit
T-10: Digest pin'le
T-8:  Production audit
T-5:  Deploy başlat
T+5:  Canary 10%
T+10: Canary 50%
T+15: Full 100%
T+30: Checkpoint 1
T+60: Checkpoint 2
T+120: Görev tamamlandı 🎉
```

---

**🚀 GÜVENLİKLE ÇALIŞTIR!**

**Referans**: `docs/LAUNCH_SNAP_321.md` - hızlı komutlar için

**🟢 LAUNCH İÇİN HAZIR! 🚀**
