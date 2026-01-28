<#-- FreeMarker Template for Customer JSON Transformation -->
<#-- This template transforms input customer JSON to a different output format -->
{
    "clientReference": "${customerId}",
    "profile": {
        "fullName": "${personalInfo.firstName} ${personalInfo.lastName}",
        "contact": {
            "primaryEmail": "${personalInfo.email}",
            "mobile": "${personalInfo.phoneNumber}"
        },
        "dob": "${personalInfo.dateOfBirth}"
    },
    "financialAccounts": [
    <#list accounts as account>
        {
            "accountId": "${account.accountNumber}",
            "type": "${account.accountType?upper_case}",
            "currentBalance": {
            "amount": ${account.balance?c},
            "currencyCode": "${account.currency}"
        },
        "isActive": <#if account.status == "ACTIVE">true<#else>false</#if>
        }<#if account?has_next>,</#if>
    </#list>
],
"totalBalance": {
"amount": <#assign total = 0><#list accounts as account><#assign total = total + account.balance></#list>${total?c},
"currency": "USD"
},
"notifications": {
"channels": [
<#if preferences.emailNotifications>"EMAIL"</#if><#if preferences.emailNotifications && preferences.smsNotifications>, </#if><#if preferences.smsNotifications>"SMS"</#if>
],
"locale": "${preferences.preferredLanguage!'en-US'}"
},
"metadata": {
"transformedAt": "${.now?iso_utc}",
"accountCount": ${accounts?size}
}
}