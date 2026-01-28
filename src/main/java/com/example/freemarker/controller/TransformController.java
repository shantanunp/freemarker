package com.example.freemarker.controller;

import com.example.freemarker.dto.CustomerInputDTO;
import com.example.freemarker.service.JsonTransformService;
import com.fasterxml.jackson.databind.ObjectMapper;
import freemarker.template.TemplateException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/transform")
@RequiredArgsConstructor
@Slf4j
public class TransformController {

    private final JsonTransformService transformService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/customer", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> transformCustomer(
            @RequestBody CustomerInputDTO input,
            @RequestParam(defaultValue = "customer-transform.ftl") String template) {

        try {
            log.info("Received transformation request for customer: {}", input.getCustomerId());

            String transformedJson = transformService.transformJson(input, template);
            Map<String, Object> result = objectMapper.readValue(transformedJson, Map.class);

            return ResponseEntity.ok(result);
        } catch (IOException | TemplateException e) {
            log.error("Error during transformation", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/raw", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> transformRawJson(
            @RequestBody String inputJson,
            @RequestParam String template) {

        try {
            log.info("Received raw JSON transformation request");

            String transformedJson = transformService.transformJsonString(inputJson, template);
            Map<String, Object> result = objectMapper.readValue(transformedJson, Map.class);

            return ResponseEntity.ok(result);
        } catch (IOException | TemplateException e) {
            log.error("Error during transformation", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}