# Quick Launch Guide 🚀

## TL;DR - 3 Adımda Production'a Hazır

```bash
# 1. Audit çalıştır (5 dakika)
./scripts/pre-launch-audit.sh https://api.yourcompany.com

# 2. Dashboard import et (2 dakika)
# Grafana → Import → day-0-1-monitoring.json

# 3. Deploy et
kubectl apply -f infra/k8s/
```

---

## 1️⃣ Pre-Launch Audit (5 dakika)

### Linux/macOS
```bash
chmod +x scripts/pre-launch-audit.sh
./scripts/pre-launch-audit.sh https://api.yourcompany.com
echo "Exit code: $?"  # 0 = GO, 1 = HOLD
```

### Windows PowerShell
```powershell
.\scripts\pre-launch-audit.ps1 -BaseUrl "https://api.yourcompany.com"
$LASTEXITCODE  # 0 = GO, 1 = HOLD
```

### Beklenen Çıktı

```
🚀 Pre-Launch Audit Script
Base URL: https://api.yourcompany.com
============================================================

📋 HTTP & Cache Validation (RFC 9110, RFC 9111, RFC 9457)
────────────────────────────────────────────────────────
✅ PASS: Health endpoint returns 200 OK
✅ PASS: X-Request-Id header present in response
✅ PASS: traceparent header propagated (W3C Trace Context)
✅ PASS: ETag or Last-Modified header present (RFC 9111 caching)
✅ PASS: Problem Details content-type present (RFC 9457)
✅ PASS: Problem Details structure valid (type/title/status/detail)

📊 Prometheus Metrics Validation
────────────────────────────────────────────────────────
✅ PASS: Prometheus API accessible
✅ PASS: Found 12 counter metrics with _total suffix
✅ PASS: Found 8 duration metrics with _seconds suffix
...

============================================================
📊 AUDIT SUMMARY
============================================================
✅ Passed: 28
❌ Failed: 0
⚠️  Warnings: 1
Total checks: 29
Pass rate: 96%

🚀 GO FOR LAUNCH! System ready for production deployment.
```

---

## 2️⃣ GO/NO-GO Karar Çerçevesi

### ✅ GO (Deploy Et)
- Tüm kritik kontroller PASS
- Exit code = 0
- Warnings kabul edilebilir seviyede

### 🛑 HOLD (Deploy Etme)
Aşağıdaki kritik kontroller FAIL ise:

#### A. HTTP Caching (RFC 9110/9111)
**Neden**: Ağ trafiğini azaltır, tutarlı 304 davranışı gerekir  
**Düzeltme**: ETag/Last-Modified döndür, 304'te korunmalı  
**Referans**: [RFC 9110](https://httpwg.org/specs/rfc9110.html), [RFC 9111](https://httpwg.org/specs/rfc9111.html)

#### B. Problem Details (RFC 9457)
**Neden**: Makinece okunur, tutarlı hata formatı  
**Düzeltme**: 4xx/5xx'de `application/problem+json` + type/title/status/detail  
**Referans**: [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html)

#### C. Trace Context (W3C)
**Neden**: Servisler arası izleme için traceparent propagation  
**Düzeltme**: Gelen traceparent'ı propagate et, X-Request-Id ekle  
**Referans**: [W3C Trace Context](https://www.w3.org/TR/trace-context/)

#### D. Prometheus Metrics
**Neden**: Doğru isimlendirme olmadan grafik/alert gürültü üretir  
**Düzeltme**: Counters `_total`, duration `_seconds`, düşük kardinalite  
**Referans**: [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

#### E. Kubernetes Probes
**Neden**: Sorunsuz kapanış, pod sağlık sinyalleri  
**Düzeltme**: preStop hook, terminationGracePeriodSeconds ≥30s, liveness/readiness  
**Referans**: [Kubernetes Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)

#### F. Visibility Timeout
**Neden**: Worker çökünce claim'li kayıtlar kitlenmesin  
**Düzeltme**: Claim'de timeout, periyodik stuck reset job  
**Referans**: [AWS SQS Visibility](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)

#### G. TTL Lifecycle
**Neden**: Otomatik veri temizliği, maliyet/uyumluluk  
**Düzeltme**: MongoDB TTL index, expireAt + expireAfterSeconds: 0  
**Referans**: [MongoDB TTL](https://www.mongodb.com/docs/manual/core/index-ttl/)

#### H. API Security (OWASP)
**Neden**: En sık güvenlik açıkları  
**Düzeltme**: Rate limit, RBAC, idempotency, PII masking  
**Referans**: [OWASP API Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)

---

## 3️⃣ FAIL Görürsen: Hızlı Düzeltme

### HTTP Caching FAIL
```bash
# Test
curl -i https://api.../orders/ORD-123/payment

# Beklenen
ETag: W/"abc123"
Last-Modified: Wed, 21 Oct 2024 07:28:00 GMT

# 304 Test
curl -i -H 'If-None-Match: W/"abc123"' https://api.../orders/ORD-123/payment
# → 304 Not Modified + ETag + Last-Modified korunmalı
```

**Düzeltme**:
```python
# FastAPI endpoint
@app.get("/api/v1/orders/{order_id}/payment")
async def get_payment_status(
    order_id: str,
    if_none_match: Optional[str] = Header(None)
):
    payment = await get_payment(order_id)
    etag = f'W/"{payment.updated_at.timestamp()}"'
    
    if if_none_match == etag:
        return Response(status_code=304, headers={
            "ETag": etag,
            "Last-Modified": payment.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT")
        })
    
    return JSONResponse(
        content=payment.dict(),
        headers={
            "ETag": etag,
            "Last-Modified": payment.updated_at.strftime("%a, %d %b %Y %H:%M:%S GMT"),
            "Cache-Control": "private, max-age=60"
        }
    )
```

---

### Problem Details FAIL
```bash
# Test
curl https://api.../payments/invalid -H "Accept: application/problem+json"

# Beklenen
Content-Type: application/problem+json
{
  "type": "https://api.../problems/payment-not-found",
  "title": "Payment Not Found",
  "status": 404,
  "detail": "Payment with ID 'invalid' does not exist",
  "instance": "/api/v1/payments/invalid"
}
```

**Düzeltme**:
```python
# FastAPI exception handler
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

@app.exception_handler(PaymentNotFoundError)
async def payment_not_found_handler(request: Request, exc: PaymentNotFoundError):
    return JSONResponse(
        status_code=404,
        content={
            "type": f"{request.base_url}problems/payment-not-found",
            "title": "Payment Not Found",
            "status": 404,
            "detail": str(exc),
            "instance": str(request.url.path)
        },
        headers={"Content-Type": "application/problem+json"}
    )
```

---

### Trace Context FAIL
```bash
# Test
curl -i -H "traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01" \
     -H "X-Request-Id: $(uuidgen)" \
     https://api.../health

# Beklenen
traceparent: 00-0af7651916cd43dd8448eb211c80319c-<new-span-id>-01
X-Request-Id: <same-uuid>
```

**Düzeltme**:
```python
# FastAPI middleware
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

class TracingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Extract or generate trace context
        traceparent = request.headers.get("traceparent")
        request_id = request.headers.get("X-Request-Id", str(uuid.uuid4()))
        
        # Propagate to response
        response = await call_next(request)
        response.headers["X-Request-Id"] = request_id
        
        if traceparent:
            # Parse and create new span
            parts = traceparent.split("-")
            if len(parts) == 4:
                new_span_id = uuid.uuid4().hex[:16]
                new_traceparent = f"{parts[0]}-{parts[1]}-{new_span_id}-{parts[3]}"
                response.headers["traceparent"] = new_traceparent
        
        return response

app.add_middleware(TracingMiddleware)
```

---

### Prometheus Metrics FAIL
```bash
# Test
curl http://localhost:9090/metrics | grep -E "payment|notification"

# Beklenen
payment_init_total{provider="iyzico",result="success"} 1234
notification_dispatch_total{channel="email",status="sent"} 567
payment_init_latency_seconds_bucket{provider="iyzico",le="0.5"} 100
```

**Düzeltme**:
```python
from prometheus_client import Counter, Histogram

# Counters end with _total
payment_init_total = Counter(
    'payment_init_total',
    'Total payment initializations',
    ['provider', 'result']
)

# Duration metrics end with _seconds
payment_init_latency_seconds = Histogram(
    'payment_init_latency_seconds',
    'Payment initialization latency',
    ['provider'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

# Usage
payment_init_total.labels(provider='iyzico', result='success').inc()
with payment_init_latency_seconds.labels(provider='iyzico').time():
    await process_payment()
```

---

### Kubernetes Probes FAIL
```yaml
# deployment.yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: payment-api
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
```

---

### TTL Index FAIL
```bash
# Test
mongosh --eval "db.notifications_outbox.getIndexes()"

# Beklenen
{
  "key": { "expireAt": 1 },
  "name": "expireAt_ttl",
  "expireAfterSeconds": 0
}
```

**Düzeltme**:
```javascript
// MongoDB migration
db.notifications_outbox.createIndex(
  { "expireAt": 1 },
  { 
    name: "expireAt_ttl",
    expireAfterSeconds: 0
  }
);

// Verify
db.notifications_outbox.getIndexes();
```

---

## 4️⃣ Day 0-1 Dashboard Import (2 dakika)

1. Grafana'yı aç
2. **Dashboards → Import**
3. `infra/monitoring/grafana/dashboards/day-0-1-monitoring.json` yükle
4. Prometheus data source seç
5. **Import** tıkla

### İzlenecek Metrikler (İlk 24-48 Saat)

**Critical Health**:
- ✅ Service uptime = 100%
- ✅ Error rate < 1%
- ✅ P95 latency < 2s
- ✅ Active alerts = 0

**Payment System**:
- ✅ Payment success rate > 95%
- ✅ Webhook processing normal
- ✅ Reconciliation running

**Notification System**:
- ✅ Backlog < 100
- ✅ Dispatch rate stable
- ✅ Stuck resets < 10/hour

**Kubernetes**:
- ✅ Pod restarts = 0
- ✅ Probe failures = 0
- ✅ Memory/CPU normal

---

## 5️⃣ Hızlı Doğrulama Komutları

### 304 Disiplini
```bash
# 1. Get ETag
curl -i https://api.../orders/ORD-123/payment

# 2. Test 304
curl -i -H 'If-None-Match: W/"..."' https://api.../orders/ORD-123/payment
# → 304 + ETag + Last-Modified korunmalı
```

### Problem Details
```bash
# Bilerek 404 tetikle
curl -i https://api.../payments/invalid -H "Accept: application/problem+json"
# → Content-Type: application/problem+json
# → type, title, status, detail alanları mevcut
```

### Trace Context
```bash
# traceparent gönder
curl -i -H "traceparent: 00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01" \
     https://api.../health
# → traceparent response'da propagate edilmeli
```

### TTL Index
```bash
# MongoDB'de kontrol
mongosh --eval "db.notifications_outbox.getIndexes()" | grep expireAt
# → expireAt TTL index görünmeli
```

---

## 6️⃣ Launch Day Timeline

### T-24 Hours
- [ ] Staging'de audit çalıştır
- [ ] Dashboard import et
- [ ] Tüm dokümantasyonu gözden geçir
- [ ] Stakeholder'ları bilgilendir
- [ ] Rollback planını hazırla

### T-1 Hour
- [ ] Production'da final audit
- [ ] Tüm kontroller PASS
- [ ] Monitoring hazır
- [ ] Team standby
- [ ] Communication channels açık

### T-0 (Launch)
- [ ] Deploy et
- [ ] Dashboard'u sürekli izle
- [ ] Alert'leri takip et
- [ ] Critical flow'ları doğrula
- [ ] Sorunları dokümante et

### T+1 Hour
- [ ] Error rate'leri gözden geçir
- [ ] Payment success rate kontrol et
- [ ] Webhook processing doğrula
- [ ] Notification backlog izle
- [ ] Stakeholder'ları güncelle

### T+24 Hours
- [ ] Tüm metrikleri gözden geçir
- [ ] Performance trend'lerini analiz et
- [ ] Öğrenilenleri dokümante et
- [ ] Optimizasyonları planla
- [ ] Başarıyı kutla! 🎉

---

## 🚨 Emergency Rollback

### Rollback Tetikleyicileri
- Error rate > 10% (5 dakika)
- Payment success rate < 90% (5 dakika)
- P95 latency > 10s (5 dakika)
- Kritik veri kaybı
- Güvenlik ihlali

### Rollback Komutu
```bash
# Kubernetes rollback
kubectl rollout undo deployment/payment-api

# Verify
kubectl rollout status deployment/payment-api

# Check pods
kubectl get pods -l app=payment-api
```

---

## 📞 Emergency Contacts

- **DevOps Lead**: [contact]
- **Backend Lead**: [contact]
- **Payment Providers**:
  - iyzico: +90 850 222 0 600
  - PayTR: +90 444 25 52
- **On-Call**: [PagerDuty/Slack]

---

## ✅ Final Checklist

- [ ] Audit script çalıştırıldı (exit code 0)
- [ ] Dashboard import edildi
- [ ] Tüm kritik kontroller PASS
- [ ] Monitoring çalışıyor
- [ ] Team hazır
- [ ] Rollback planı hazır
- [ ] Communication channels açık

---

**🚀 Hazırsan, audit'i çalıştır ve sonuçları paylaş!**

Herhangi bir FAIL görürsen, yukarıdaki düzeltmeleri uygula ve tekrar çalıştır.

**GO FOR LAUNCH!** 🎯
