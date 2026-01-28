package com.example.freemarker.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerInputDTO {
    private String customerId;
    private PersonalInfo personalInfo;
    private List<AccountInfo> accounts;
    private ContactPreferences preferences;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PersonalInfo {
        private String firstName;
        private String lastName;
        private String dateOfBirth;
        private String email;
        private String phoneNumber;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AccountInfo {
        private String accountNumber;
        private String accountType;
        private Double balance;
        private String currency;
        private String status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContactPreferences {
        private Boolean emailNotifications;
        private Boolean smsNotifications;
        private String preferredLanguage;
    }
}