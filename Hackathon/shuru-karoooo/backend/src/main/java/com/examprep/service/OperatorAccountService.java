package com.examprep.service;

import com.examprep.entity.OperatorAccount;
import com.examprep.repository.OperatorAccountRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class OperatorAccountService implements UserDetailsService {

    private final OperatorAccountRepository repository;
    private final PasswordEncoder passwordEncoder;

    public OperatorAccountService(OperatorAccountRepository repository, PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public OperatorAccount register(String email, String displayName, String password) {
        String normalizedEmail = normalizeEmail(email);
        if (repository.existsByEmail(normalizedEmail)) {
            throw new AccountAlreadyExistsException();
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new InvalidPasswordException();
        }
        OperatorAccount account = new OperatorAccount(
                normalizedEmail,
                displayName.trim(),
                passwordEncoder.encode(password)
        );
        return repository.saveAndFlush(account);
    }

    public OperatorAccount findByNormalizedEmail(String email) {
        return repository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new UsernameNotFoundException("Account not found"));
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        OperatorAccount account = findByNormalizedEmail(email);
        return User.withUsername(account.getEmail())
                .password(account.getPasswordHash())
                .roles("OPERATOR")
                .build();
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    public static class AccountAlreadyExistsException extends RuntimeException {
    }

    public static class InvalidPasswordException extends RuntimeException {
    }
}
