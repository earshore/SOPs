/**
 * 邮件模板数据管理
 * 覆盖欧洲10国站点的多语言客服邮件模板
 */

// 站点配置 - 10个欧洲站点
export const SITES = [
    { code: 'en', name: 'UK (English)', flag: '🇬🇧', active: true },
    { code: 'de', name: 'DE (Deutsch)', flag: '🇩🇪', active: false },
    { code: 'fr', name: 'FR (Français)', flag: '🇫🇷', active: false },
    { code: 'it', name: 'IT (Italiano)', flag: '🇮🇹', active: false },
    { code: 'es', name: 'ES (Español)', flag: '🇪🇸', active: false },
    { code: 'nl', name: 'NL (Nederlands)', flag: '🇳🇱', active: false },
    { code: 'se', name: 'SE (Svenska)', flag: '🇸🇪', active: false },
    { code: 'pl', name: 'PL (Polski)', flag: '🇵🇱', active: false },
    { code: 'be', name: 'BE (NL/FR)', flag: '🇧🇪', active: false },
    { code: 'ie', name: 'IE (English)', flag: '🇮🇪', active: false }
];

// 模板场景配置
export const TEMPLATE_CATEGORIES = [
    { id: 'delivery_delay', name: '物流延误 / Delivery Delay', icon: 'fa-truck', color: 'amber', badge: '高频' },
    { id: 'damaged_product', name: '产品破损 / Damaged Product', icon: 'fa-box-open', color: 'red', badge: '关键' },
    { id: 'refund_request', name: '退款请求 / Refund Request', icon: 'fa-hand-holding-dollar', color: 'purple', badge: '' },
    { id: 'invoice_request', name: '发票索取 / Invoice Request', icon: 'fa-file-invoice', color: 'emerald', badge: '欧洲高频' },
    { id: 'partial_refund', name: '部分退款 / Partial Refund', icon: 'fa-coins', color: 'blue', badge: '挽留神器' },
    { id: 'usage_help', name: '使用咨询 / Usage Help', icon: 'fa-question-circle', color: 'indigo', badge: '' }
];

// 多语言模板内容
export const EMAIL_TEMPLATES = {
    // 物流延误模板
    delivery_delay: {
        en: `Dear Customer,

Thank you for your message. We sincerely apologize for the delay in delivery.

Your order is currently in transit and is expected to arrive within [X] business days. We are monitoring it closely.

If you do not receive it by [Date], please contact us and we will resolve this immediately.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

vielen Dank für Ihre Nachricht. Wir entschuldigen uns aufrichtig für die Verzögerung.

Ihre Bestellung ist unterwegs und sollte innerhalb von [X] Werktagen eintreffen.

Falls Sie die Sendung bis zum [Datum] nicht erhalten, kontaktieren Sie uns bitte erneut.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Merci pour votre message. Nous vous présentons nos excuses pour ce retard de livraison.

Votre commande est en cours d'acheminement et devrait arriver sous [X] jours ouvrés.

Si vous ne la recevez pas d'ici le [Date], n'hésitez pas à nous recontacter.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Grazie per il suo messaggio. Ci scusiamo sinceramente per il ritardo nella consegna.

Il suo ordine è in transito e dovrebbe arrivare entro [X] giorni lavorativi.

Se non lo riceve entro il [Data], la preghiamo di ricontattarci.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Gracias por su mensaje. Pedimos disculpas por el retraso en la entrega.

Su pedido está en camino y debería llegar en [X] días hábiles.

Si no lo recibe antes del [Fecha], por favor contáctenos de nuevo.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Bedankt voor uw bericht. Onze oprechte excuses voor de vertraging in de levering.

Uw bestelling is onderweg en zal naar verwachting binnen [X] werkdagen aankomen. Wij houden dit nauwlettend in de gaten.

Als u de bestelling niet ontvangt voor [Datum], neem dan contact met ons op en wij lossen dit direct op.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Tack för ditt meddelande. Vi ber uppriktigt om ursäkt för förseningen i leveransen.

Din beställning är för närvarande på väg och förväntas anlända inom [X] arbetsdagar. Vi övervakar den noga.

Om du inte får den senast [Datum], vänligen kontakta oss så löser vi detta omedelbart.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Dziękujemy za wiadomość. Szczerze przepraszamy za opóźnienie w dostawie.

Twoje zamówienie jest w drodze i powinno dotrzeć w ciągu [X] dni roboczych. Uważnie to monitorujemy.

Jeśli nie otrzymasz przesyłki do [Data], skontaktuj się z nami, a natychmiast rozwiążemy ten problem.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Bedankt voor uw bericht. Onze oprechte excuses voor de vertraging in de levering.

Uw bestelling is onderweg en zal naar verwachting binnen [X] werkdagen aankomen.

Als u de bestelling niet ontvangt voor [Datum], neem dan contact met ons op.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

Thank you for your message. We sincerely apologise for the delay in delivery.

Your order is currently in transit and is expected to arrive within [X] business days. We are monitoring it closely.

If you do not receive it by [Date], please contact us and we will resolve this immediately.

Kind regards,
[Brand] Customer Service`
    },

    // 产品破损模板
    damaged_product: {
        en: `Dear Customer,

We are very sorry to hear that your product arrived damaged.

To resolve this, we can offer:
✅ Option 1: Full replacement (no need to return)
✅ Option 2: Full refund

Please let us know which you prefer, and we will process it immediately.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

Es tut uns sehr leid, dass Ihr Produkt beschädigt angekommen ist.

Wir bieten Ihnen folgende Optionen an:
✅ Option 1: Kostenloser Ersatz (ohne Rücksendung)
✅ Option 2: Vollständige Rückerstattung

Bitte teilen Sie uns Ihre Präferenz mit.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Nous sommes navrés d'apprendre que votre produit est arrivé endommagé.

Pour résoudre ce problème, nous vous proposons :
✅ Option 1 : Remplacement gratuit (sans retour)
✅ Option 2 : Remboursement intégral

Merci de nous indiquer votre choix.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Ci dispiace molto sapere che il prodotto è arrivato danneggiato.

Per risolvere, le offriamo:
✅ Opzione 1: Sostituzione gratuita (senza reso)
✅ Opzione 2: Rimborso completo

La preghiamo di comunicarci la sua preferenza.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Lamentamos mucho que su producto haya llegado dañado.

Para solucionarlo, le ofrecemos:
✅ Opción 1: Reemplazo gratuito (sin devolución)
✅ Opción 2: Reembolso completo

Por favor indíquenos su preferencia.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Het spijt ons zeer te horen dat uw product beschadigd is aangekomen.

Om dit op te lossen, bieden wij u:
✅ Optie 1: Volledige vervanging (geen retourzending nodig)
✅ Optie 2: Volledige terugbetaling

Laat ons weten welke optie uw voorkeur heeft, en wij verwerken dit onmiddellijk.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Vi är mycket ledsna att höra att din produkt anlände skadad.

För att lösa detta kan vi erbjuda:
✅ Alternativ 1: Full ersättning (ingen retur behövs)
✅ Alternativ 2: Full återbetalning

Vänligen meddela oss vad du föredrar, så behandlar vi det omedelbart.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Bardzo nam przykro słyszeć, że Twój produkt dotarł uszkodzony.

Aby rozwiązać ten problem, możemy zaoferować:
✅ Opcja 1: Pełna wymiana (bez konieczności zwrotu)
✅ Opcja 2: Pełny zwrot pieniędzy

Proszę dać nam znać, co preferujesz, a natychmiast to zrealizujemy.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Het spijt ons zeer te horen dat uw product beschadigd is aangekomen.

Om dit op te lossen, bieden wij u:
✅ Optie 1: Volledige vervanging (geen retourzending nodig)
✅ Optie 2: Volledige terugbetaling

Laat ons weten welke optie uw voorkeur heeft.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

We are very sorry to hear that your product arrived damaged.

To resolve this, we can offer:
✅ Option 1: Full replacement (no need to return)
✅ Option 2: Full refund

Please let us know which you prefer, and we will process it immediately.

Kind regards,
[Brand] Customer Service`
    },

    // 退款请求模板
    refund_request: {
        en: `Dear Customer,

Thank you for contacting us regarding your refund request.

To process this, please initiate the return through Amazon's Return Center. Once we receive the item (or if no return is needed), we will issue a full refund within 3-5 business days.

If you have any questions, please let us know.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

vielen Dank für Ihre Anfrage zur Rückerstattung.

Bitte starten Sie die Rücksendung über das Amazon-Rücksendeportal. Nach Erhalt (oder falls keine Rücksendung erforderlich ist) erfolgt die Erstattung innerhalb von 3-5 Werktagen.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Merci de nous avoir contactés concernant votre demande de remboursement.

Veuillez initier le retour via le Centre de Retours Amazon. Après réception (ou si aucun retour n'est nécessaire), nous procéderons au remboursement sous 3 à 5 jours ouvrés.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Grazie per averci contattato riguardo alla sua richiesta di rimborso.

La preghiamo di avviare il reso tramite il Centro Resi di Amazon. Dopo la ricezione (o se non è necessario il reso), emetteremo il rimborso entro 3-5 giorni lavorativi.

Per qualsiasi domanda, non esiti a contattarci.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Gracias por contactarnos sobre su solicitud de reembolso.

Por favor inicie la devolución a través del Centro de Devoluciones de Amazon. Una vez recibido (o si no es necesaria la devolución), procesaremos el reembolso en 3-5 días hábiles.

Si tiene alguna pregunta, no dude en contactarnos.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Bedankt dat u contact met ons opneemt over uw terugbetalingsverzoek.

Om dit te verwerken, start u de retour via het Amazon Retourcentrum. Zodra wij het artikel ontvangen (of als geen retour nodig is), storten wij het volledige bedrag terug binnen 3-5 werkdagen.

Als u vragen heeft, laat het ons weten.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Tack för att du kontaktar oss angående din återbetalningsbegäran.

För att behandla detta, vänligen initiera returen via Amazons Returcenter. När vi har tagit emot artikeln (eller om ingen retur behövs) kommer vi att utfärda en full återbetalning inom 3-5 arbetsdagar.

Om du har några frågor, vänligen meddela oss.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Dziękujemy za kontakt w sprawie zwrotu pieniędzy.

Aby przetworzyć zwrot, prosimy o zainicjowanie go przez Centrum Zwrotów Amazon. Po otrzymaniu przedmiotu (lub jeśli zwrot nie jest wymagany) dokonamy pełnego zwrotu pieniędzy w ciągu 3-5 dni roboczych.

Jeśli masz pytania, daj nam znać.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Bedankt dat u contact met ons opneemt over uw terugbetalingsverzoek.

Om dit te verwerken, start u de retour via het Amazon Retourcentrum. Zodra wij het artikel ontvangen, storten wij het volledige bedrag terug binnen 3-5 werkdagen.

Als u vragen heeft, laat het ons weten.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

Thank you for contacting us regarding your refund request.

To process this, please initiate the return through Amazon's Return Centre. Once we receive the item (or if no return is needed), we will issue a full refund within 3-5 business days.

If you have any questions, please let us know.

Kind regards,
[Brand] Customer Service`
    },

    // 发票索取模板
    invoice_request: {
        en: `Dear Customer,

Thank you for your invoice request.

Please find your VAT invoice attached to this message. If you need any modifications (company name, VAT number, etc.), please let us know the correct details.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

vielen Dank für Ihre Rechnungsanfrage.

Anbei finden Sie Ihre Rechnung mit ausgewiesener MwSt. Falls Sie Änderungen benötigen (Firmenname, USt-IdNr. etc.), teilen Sie uns bitte die korrekten Daten mit.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Merci pour votre demande de facture.

Veuillez trouver ci-joint votre facture avec TVA. Si vous avez besoin de modifications (nom d'entreprise, numéro de TVA, etc.), merci de nous communiquer les informations correctes.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Grazie per la sua richiesta di fattura.

In allegato trova la fattura con IVA. Se necessita di modifiche (ragione sociale, partita IVA, ecc.), la preghiamo di comunicarci i dati corretti.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Gracias por solicitar su factura.

Adjuntamos su factura con IVA. Si necesita alguna modificación (nombre de empresa, número de IVA, etc.), por favor indíquenos los datos correctos.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Bedankt voor uw factuurverzoek.

Bijgevoegd vindt u uw BTW-factuur. Als u wijzigingen nodig heeft (bedrijfsnaam, BTW-nummer, etc.), laat ons dan de juiste gegevens weten.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Tack för din fakturabegäran.

Vänligen se din momsfaktura bifogad till detta meddelande. Om du behöver ändringar (företagsnamn, momsnummer, etc.), vänligen meddela oss de korrekta uppgifterna.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Dziękujemy za prośbę o fakturę.

W załączeniu przesyłamy fakturę VAT. Jeśli potrzebujesz jakichkolwiek zmian (nazwa firmy, numer VAT itp.), prosimy o podanie prawidłowych danych.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Bedankt voor uw factuurverzoek.

Bijgevoegd vindt u uw BTW-factuur. Als u wijzigingen nodig heeft (bedrijfsnaam, BTW-nummer, etc.), laat ons dan de juiste gegevens weten.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

Thank you for your invoice request.

Please find your VAT invoice attached to this message. If you need any modifications (company name, VAT number, etc.), please let us know the correct details.

Kind regards,
[Brand] Customer Service`
    },

    // 部分退款模板
    partial_refund: {
        en: `Dear Customer,

We are sorry to hear about the issue with your order.

As a gesture of goodwill, we would like to offer you a partial refund of €[X] while you keep the product. Alternatively, we can arrange a full replacement or refund.

Please let us know how you would like to proceed.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

Es tut uns leid von dem Problem zu hören.

Als Entschädigung möchten wir Ihnen eine Teilerstattung von €[X] anbieten, wobei Sie das Produkt behalten können. Alternativ können wir einen vollständigen Ersatz oder Erstattung veranlassen.

Bitte teilen Sie uns mit, wie Sie vorgehen möchten.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Nous sommes navrés d'apprendre ce problème.

En guise de geste commercial, nous vous proposons un remboursement partiel de €[X] tout en conservant le produit. Sinon, nous pouvons organiser un remplacement ou remboursement complet.

Merci de nous indiquer votre préférence.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Ci dispiace per il problema riscontrato.

Come gesto di buona volontà, le offriamo un rimborso parziale di €[X] mantenendo il prodotto. In alternativa, possiamo organizzare una sostituzione o un rimborso completo.

La preghiamo di comunicarci come preferisce procedere.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Lamentamos el problema con su pedido.

Como gesto de buena voluntad, le ofrecemos un reembolso parcial de €[X] conservando el producto. Alternativamente, podemos organizar un reemplazo o reembolso completo.

Por favor indíquenos cómo desea proceder.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Het spijt ons te horen over het probleem met uw bestelling.

Als gebaar van goede wil willen wij u een gedeeltelijke terugbetaling van €[X] aanbieden terwijl u het product behoudt. Als alternatief kunnen wij een volledige vervanging of terugbetaling regelen.

Laat ons weten hoe u verder wilt gaan.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Vi beklagar problemet med din beställning.

Som en gest av god vilja vill vi erbjuda dig en partiell återbetalning på €[X] medan du behåller produkten. Alternativt kan vi ordna en full ersättning eller återbetalning.

Vänligen meddela oss hur du vill gå vidare.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Przykro nam słyszeć o problemie z Twoim zamówieniem.

Jako gest dobrej woli chcielibyśmy zaoferować częściowy zwrot w wysokości €[X], a Ty możesz zatrzymać produkt. Alternatywnie możemy zorganizować pełną wymianę lub zwrot pieniędzy.

Proszę dać nam znać, jak chcesz postąpić.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Het spijt ons te horen over het probleem met uw bestelling.

Als gebaar van goede wil willen wij u een gedeeltelijke terugbetaling van €[X] aanbieden terwijl u het product behoudt. Als alternatief kunnen wij een volledige vervanging of terugbetaling regelen.

Laat ons weten hoe u verder wilt gaan.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

We are sorry to hear about the issue with your order.

As a gesture of goodwill, we would like to offer you a partial refund of €[X] while you keep the product. Alternatively, we can arrange a full replacement or refund.

Please let us know how you would like to proceed.

Kind regards,
[Brand] Customer Service`
    },

    // 使用咨询模板
    usage_help: {
        en: `Dear Customer,

Thank you for your question about how to use the product.

Here is a quick guide:
1. [Step 1]
2. [Step 2]
3. [Step 3]

You can also find a detailed manual included in the package. If you have further questions, please don't hesitate to ask.

Best regards,
[Brand] Customer Service`,

        de: `Sehr geehrte/r Kunde/Kundin,

vielen Dank für Ihre Frage zur Produktnutzung.

Hier eine kurze Anleitung:
1. [Schritt 1]
2. [Schritt 2]
3. [Schritt 3]

Eine ausführliche Anleitung liegt dem Paket bei. Bei weiteren Fragen stehen wir gerne zur Verfügung.

Mit freundlichen Grüßen,
[Marke] Kundenservice`,

        fr: `Cher(e) Client(e),

Merci pour votre question concernant l'utilisation du produit.

Voici un guide rapide :
1. [Étape 1]
2. [Étape 2]
3. [Étape 3]

Un manuel détaillé est inclus dans l'emballage. N'hésitez pas à nous contacter pour toute autre question.

Cordialement,
[Marque] Service Client`,

        it: `Gentile Cliente,

Grazie per la sua domanda sull'utilizzo del prodotto.

Ecco una guida rapida:
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

Un manuale dettagliato è incluso nella confezione. Per ulteriori domande, non esiti a contattarci.

Cordiali saluti,
[Marca] Servizio Clienti`,

        es: `Estimado/a Cliente,

Gracias por su consulta sobre cómo usar el producto.

Aquí tiene una guía rápida:
1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

También encontrará un manual detallado en el paquete. Si tiene más preguntas, no dude en contactarnos.

Saludos cordiales,
[Marca] Servicio al Cliente`,

        nl: `Beste klant,

Bedankt voor uw vraag over het gebruik van het product.

Hier is een snelle handleiding:
1. [Stap 1]
2. [Stap 2]
3. [Stap 3]

U vindt ook een gedetailleerde handleiding in de verpakking. Als u nog vragen heeft, aarzel dan niet om te vragen.

Met vriendelijke groet,
[Merk] Klantenservice`,

        se: `Kära kund,

Tack för din fråga om hur man använder produkten.

Här är en snabbguide:
1. [Steg 1]
2. [Steg 2]
3. [Steg 3]

Du hittar också en detaljerad manual i förpackningen. Om du har fler frågor, tveka inte att fråga.

Vänliga hälsningar,
[Varumärke] Kundtjänst`,

        pl: `Szanowny Kliencie,

Dziękujemy za pytanie dotyczące użytkowania produktu.

Oto krótki przewodnik:
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

Szczegółowa instrukcja jest dołączona do opakowania. Jeśli masz dodatkowe pytania, nie wahaj się zapytać.

Z poważaniem,
[Marka] Obsługa Klienta`,

        be: `Beste klant,

Bedankt voor uw vraag over het gebruik van het product.

Hier is een snelle handleiding:
1. [Stap 1]
2. [Stap 2]
3. [Stap 3]

U vindt ook een gedetailleerde handleiding in de verpakking. Als u nog vragen heeft, aarzel dan niet om te vragen.

Met vriendelijke groet,
[Merk] Klantenservice`,

        ie: `Dear Customer,

Thank you for your question about how to use the product.

Here is a quick guide:
1. [Step 1]
2. [Step 2]
3. [Step 3]

You can also find a detailed manual included in the package. If you have further questions, please don't hesitate to ask.

Kind regards,
[Brand] Customer Service`
    }
};

/**
 * 获取指定场景和语言的模板内容
 * @param {string} templateId - 模板场景ID
 * @param {string} langCode - 语言代码
 * @returns {string} 模板内容
 */
export function getTemplate(templateId, langCode) {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) return '';
    return template[langCode] || template['en'] || '';
}

/**
 * 获取模板用于HTML显示（换行转<br>）
 * @param {string} templateId - 模板场景ID
 * @param {string} langCode - 语言代码
 * @returns {string} HTML格式的模板内容
 */
export function getTemplateHtml(templateId, langCode) {
    const content = getTemplate(templateId, langCode);
    return content.replace(/\n/g, '<br />');
}
