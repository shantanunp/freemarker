package com.example.freemarker.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.StringWriter;
import java.util.Map;

@Service
@Slf4j
public class JsonTransformService {

    private final Configuration freemarkerConfig;
    private final ObjectMapper objectMapper;

    public JsonTransformService(@Qualifier("freemarkerConfiguration") Configuration freemarkerConfig,
                                ObjectMapper objectMapper) {
        this.freemarkerConfig = freemarkerConfig;
        this.objectMapper = objectMapper;
    }

    /**
     * Transform input JSON to output JSON using FreeMarker template
     */
    public String transformJson(Object inputData, String templateName) throws IOException, TemplateException {
        log.info("Starting JSON transformation with template: {}", templateName);

        // Convert input object to Map for FreeMarker
        Map<String, Object> dataModel = objectMapper.convertValue(inputData, Map.class);

        // Load template
        Template template = freemarkerConfig.getTemplate(templateName);

        // Process template
        StringWriter writer = new StringWriter();
        template.process(dataModel, writer);

        String result = writer.toString();
        log.debug("Transformation completed. Output: {}", result);

        return result;
    }

    /**
     * Transform JSON string to another JSON string
     */
    public String transformJsonString(String inputJson, String templateName) throws IOException, TemplateException {
        Map<String, Object> dataModel = objectMapper.readValue(inputJson, Map.class);

        Template template = freemarkerConfig.getTemplate(templateName);

        StringWriter writer = new StringWriter();
        template.process(dataModel, writer);

        return writer.toString();
    }
}