package com.examprep.controller;

import com.examprep.entity.OperatorAccount;
import com.examprep.service.OperatorAccountService;
import com.examprep.service.OperatorAccountService.AccountAlreadyExistsException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final OperatorAccountService accountService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    public AuthController(
            OperatorAccountService accountService,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy
    ) {
        this.accountService = accountService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy = sessionAuthenticationStrategy;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrfToken(CsrfToken csrfToken) {
        return Map.of("token", csrfToken.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            return ResponseEntity.badRequest().cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Password must be no more than 72 UTF-8 bytes."));
        }
        try {
            OperatorAccount account = accountService.register(
                    request.email(),
                    request.displayName(),
                    request.password()
            );
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(account.getEmail(), request.password())
            );
            saveAuthentication(authentication, servletRequest, servletResponse);
            return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
                    .body(new AuthResponse(account.getEmail(), account.getDisplayName()));
        } catch (AccountAlreadyExistsException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT).cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "An account with this email already exists. Sign in instead."));
        } catch (AuthenticationServiceException exception) {
            return ResponseEntity.internalServerError().cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "The account was created, but sign-in could not be completed. Please sign in."));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(request.email().trim(), request.password())
            );
            saveAuthentication(authentication, servletRequest, servletResponse);
            OperatorAccount account = accountService.findByNormalizedEmail(authentication.getName());
            return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                    .body(new AuthResponse(account.getEmail(), account.getDisplayName()));
        } catch (BadCredentialsException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Email or password is incorrect."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).cacheControl(CacheControl.noStore())
                    .body(Map.of("message", "Sign in is required."));
        }
        OperatorAccount account = accountService.findByNormalizedEmail(authentication.getName());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new AuthResponse(account.getEmail(), account.getDisplayName()));
    }

    private void saveAuthentication(
            Authentication authentication,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        sessionAuthenticationStrategy.onAuthentication(authentication, request, response);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    public record LoginRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(max = 72) String password
    ) {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 2, max = 80) String displayName,
            @NotBlank @Size(min = 10, max = 15) String password
    ) {
    }

    public record AuthResponse(String email, String displayName) {
    }
}
