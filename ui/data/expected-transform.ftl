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
        "amount": ${account.balance},
        "currencyCode": "${account.currency}"
      },
      "isActive": <#if account.status == "ACTIVE">true<#else>false</#if>
    }<#sep>,</#sep>
    </#list>
  ],
  "totalBalance": {
    "amount": <#assign total = 0><#list accounts as account><#assign total = total + account.balance></#list>${total},
    "currency": "USD"
  },
  "notifications": {
    "channels": [
      <#if preferences.emailNotifications>"EMAIL"</#if><#if preferences.emailNotifications && preferences.smsNotifications>,</#if><#if preferences.smsNotifications>"SMS"</#if>
    ],
    "locale": "${preferences.preferredLanguage}"
  },
  "metadata": {
    "transformedAt": "${.now?iso_utc}",
    "accountCount": ${accounts?size}
  }
}
