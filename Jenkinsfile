pipeline {

    agent any

    options {
        timestamps()
        ansiColor('xterm')
    }

    environment {

        // Project
        FRONTEND = "frontend"
        BACKEND  = "backend"

        // SonarQube
        SONAR_PROJECT_KEY = "stayhive"

        // Nexus
        NEXUS_URL  = "http://16.112.182.98:8081"
        NEXUS_REPO = "stayhive-raw"

        // DockerHub
        FRONTEND_IMAGE = "guru0114/stayhive-frontend"
        BACKEND_IMAGE  = "guru0114/stayhive-backend"

        IMAGE_TAG = "${BUILD_NUMBER}"
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Display Project Structure') {
            steps {
                sh '''
                echo "========== Project Structure =========="
                pwd
                ls -la

                echo ""
                echo "========== Frontend =========="
                ls -la frontend

                echo ""
                echo "========== Backend =========="
                ls -la backend
                '''
            }
        }

        stage('Backend Dependencies') {
            steps {
                dir("${BACKEND}") {
                    sh '''
                    npm install
                    '''
                }
            }
        }

        stage('SonarQube Scan') {
    steps {
        sh '''
        docker run --rm \
          -v "$WORKSPACE:/usr/src" \
          sonarsource/sonar-scanner-cli \
          -Dsonar.projectKey=stayhive \
          -Dsonar.projectName=stayhive \
          -Dsonar.host.url=http://16.112.182.98:9000 \
          -Dsonar.token=squ_61e29fcf52de1debd20d5f300c173d5290ff16eb \
          -Dsonar.sources=/usr/src
        '''
    }
}

        stage('Quality Gate') {
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Login') {
            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {

                    sh '''
                    echo "$DOCKER_PASS" | docker login \
                    -u "$DOCKER_USER" \
                    --password-stdin
                    '''

                }
            }
        }

        stage('Build Docker Images') {

            steps {

                sh """
                docker build -t ${FRONTEND_IMAGE}:${IMAGE_TAG} ./frontend
                docker build -t ${BACKEND_IMAGE}:${IMAGE_TAG} ./backend

                docker tag ${FRONTEND_IMAGE}:${IMAGE_TAG} ${FRONTEND_IMAGE}:latest
                docker tag ${BACKEND_IMAGE}:${IMAGE_TAG} ${BACKEND_IMAGE}:latest
                """

            }
        }

        stage('Push Docker Images') {

            steps {

                sh """
                docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                docker push ${FRONTEND_IMAGE}:latest

                docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                docker push ${BACKEND_IMAGE}:latest
                """

            }
        }

        stage('Package Artifact') {

            steps {

                sh '''
                zip -r stayhive.zip . \
                -x "*.git*" \
                -x "backend/node_modules/*"
                '''

            }
        }

        stage('Upload Artifact To Nexus') {

            steps {

                withCredentials([
                    usernamePassword(
                        credentialsId: 'nexus',
                        usernameVariable: 'NEXUS_USER',
                        passwordVariable: 'NEXUS_PASS'
                    )
                ]) {

                    sh """
                    curl -v \
                      -u ${NEXUS_USER}:${NEXUS_PASS} \
                      --upload-file stayhive.zip \
                      ${NEXUS_URL}/repository/${NEXUS_REPO}/stayhive-${BUILD_NUMBER}.zip
                    """

                }

            }

        }

        stage('Deploy Containers') {

            steps {

                sh '''
                docker compose down || true

                docker compose pull

                docker compose up -d

                docker image prune -af
                '''

            }
        }

        stage('Health Check') {

            steps {

                sh '''
                echo "========== Running Containers =========="

                docker ps

                echo ""

                docker compose ps
                '''

            }
        }

    }

    post {

        success {

            echo "========================================"
            echo " StayHive Deployment Successful "
            echo "========================================"

        }

        failure {

            echo "========================================"
            echo " StayHive Deployment Failed "
            echo "========================================"

        }

        always {

            cleanWs()

        }

    }

}
